/**
 * lib/ai/evaluate-opportunity.ts — Opportunity evaluator (Step 6.2)
 *
 * Builds a structured prompt from opportunity data, calls Claude, validates
 * the JSON response with Zod, computes weighted scores application-side, and
 * returns a complete OpportunityEvaluation ready for persistence.
 *
 * Rules enforced here:
 *   - Weighted scores are computed by this module, never trusted from Claude.
 *   - "Build" is never returned as a suggested decision.
 *   - Evidence URLs in the output are restricted to those supplied as input.
 *   - Malformed / partial responses are rejected; no partial saves.
 *   - The API key is read from process.env — never hardcoded or logged.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  RUBRIC_DIMENSIONS,
  scoreToDecision,
  computeWeightedScore,
  computeTotalScore,
  type DimensionKey,
} from "./rubric";
import type {
  OpportunityEvaluation,
  EvaluationScorecard,
  EvaluationNarrative,
  RubricDimension,
} from "@/lib/types";

// ── Model constant ─────────────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-6";

// ── Input type ─────────────────────────────────────────────────────────────────

export interface EvaluationInput {
  title:            string;
  problemStatement: string;
  targetCustomer:   string;
  customerType:     string;
  tags:             string[];
  discoveredAt:     string;
  // Nullable thesis fields
  thesisProblem:    string | null;
  thesisWho:        string | null;
  thesisWhyHurts:   string | null;
  thesisWhyPay:     string | null;
  thesisWhyNow:     string | null;
  // Evidence (only URL and summary are critical for evaluation)
  evidence: Array<{
    url:        string;
    title:      string | null;
    platform:   string | null;
    signalType: string | null;
    author:     string | null;
    summary:    string | null;
  }>;
  // Research and status notes
  notes: Array<{
    noteType: string;
    body:     string;
    createdAt: string;
  }>;
}

// ── Zod schema for Claude's raw response ──────────────────────────────────────
// Claude scores each dimension 0–10. Weighted totals are computed here.

const RawDimensionSchema = z.object({
  score:         z.number().int().min(0).max(10),
  justification: z.string().min(1).max(2000),
});

const ClaudeResponseSchema = z.object({
  dimensions: z.object({
    problemSeverityFrequency: RawDimensionSchema,
    evidenceStrength:         RawDimensionSchema,
    willingnessToPay:         RawDimensionSchema,
    founderMarketFit:         RawDimensionSchema,
    customerAccessDistrib:    RawDimensionSchema,
    solopreneurFeasibility:   RawDimensionSchema,
    speedToValidation:        RawDimensionSchema,
    marketExpansionPotential: RawDimensionSchema,
    differentiation:          RawDimensionSchema,
  }),
  confidence:         z.enum(["low", "medium", "high"]),
  evidenceUrlsUsed:   z.array(z.string().url()).max(50),
  factsVsAssumptions: z.string().min(1).max(3000),
  missingEvidence:    z.array(z.string().min(1)).max(10),
  strongestObjection: z.string().min(1).max(1000),
  cheapestExperiment: z.string().min(1).max(1000),
  estimatedTimeCost:  z.string().min(1).max(200),
});

type ClaudeResponse = z.infer<typeof ClaudeResponseSchema>;

// ── Prompt builder ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an opportunity evaluator for a solo fintech founder.
Your job is to evaluate whether a business opportunity deserves further time investment.
You MUST be honest and critical. Do not manufacture confidence or invent evidence.
If the evidence is sparse, say so and score accordingly.

Scoring rules:
- Score each dimension from 0 (no signal at all) to 10 (overwhelming evidence).
- A score of 5 means "possible but unverified". A score of 7 means "probable with some evidence". A score of 9–10 requires strong, specific evidence.
- You must distinguish between FACTS (things explicitly documented in the evidence) and ASSUMPTIONS (things you are inferring).
- Do not score Evidence Strength above 3 if fewer than 3 independent signals are provided.
- Do not score Willingness to Pay above 4 if there is no direct evidence of actual payment for similar solutions.
- Do not score Founder-Market Fit above 5 unless the opportunity has a clear connection to fintech, India B2B, or the founder's existing user base.

Return ONLY a valid JSON object with exactly this structure — no markdown, no explanation outside the JSON:

{
  "dimensions": {
    "problemSeverityFrequency": { "score": <0-10 integer>, "justification": "<1-2 sentences>" },
    "evidenceStrength":         { "score": <0-10 integer>, "justification": "<1-2 sentences>" },
    "willingnessToPay":         { "score": <0-10 integer>, "justification": "<1-2 sentences>" },
    "founderMarketFit":         { "score": <0-10 integer>, "justification": "<1-2 sentences>" },
    "customerAccessDistrib":    { "score": <0-10 integer>, "justification": "<1-2 sentences>" },
    "solopreneurFeasibility":   { "score": <0-10 integer>, "justification": "<1-2 sentences>" },
    "speedToValidation":        { "score": <0-10 integer>, "justification": "<1-2 sentences>" },
    "marketExpansionPotential": { "score": <0-10 integer>, "justification": "<1-2 sentences>" },
    "differentiation":          { "score": <0-10 integer>, "justification": "<1-2 sentences>" }
  },
  "confidence": "low" | "medium" | "high",
  "evidenceUrlsUsed": ["<only URLs from the supplied evidence list>"],
  "factsVsAssumptions": "<what you treated as established fact vs what you inferred>",
  "missingEvidence": ["<specific data point that would meaningfully change a score>", ...],
  "strongestObjection": "<the single most important reason this idea might fail>",
  "cheapestExperiment": "<the lowest-cost test to validate or kill the strongest assumption>",
  "estimatedTimeCost": "<human-readable: e.g. '1 week / ~₹3 000'>"
}`;

function buildUserPrompt(input: EvaluationInput): string {
  const lines: string[] = [];

  lines.push("## Opportunity to Evaluate\n");
  lines.push(`**Title:** ${input.title}`);
  lines.push(`**Problem Statement:** ${input.problemStatement}`);
  lines.push(`**Target Customer:** ${input.targetCustomer || "Not specified"}`);
  lines.push(`**Customer Type:** ${input.customerType || "Not specified"}`);
  lines.push(`**Tags:** ${input.tags.length ? input.tags.join(", ") : "None"}`);
  lines.push(`**Discovered:** ${input.discoveredAt}`);

  // Thesis (if populated)
  const hasThesis = input.thesisProblem || input.thesisWho || input.thesisWhyHurts ||
                    input.thesisWhyPay || input.thesisWhyNow;
  if (hasThesis) {
    lines.push("\n### Thesis");
    if (input.thesisProblem)  lines.push(`- Problem: ${input.thesisProblem}`);
    if (input.thesisWho)      lines.push(`- Who: ${input.thesisWho}`);
    if (input.thesisWhyHurts) lines.push(`- Why it hurts: ${input.thesisWhyHurts}`);
    if (input.thesisWhyPay)   lines.push(`- Why they'd pay: ${input.thesisWhyPay}`);
    if (input.thesisWhyNow)   lines.push(`- Why now: ${input.thesisWhyNow}`);
  }

  // Evidence
  lines.push("\n### Evidence");
  if (input.evidence.length === 0) {
    lines.push("No evidence has been added. Treat evidence quality as minimal.");
  } else {
    input.evidence.forEach((ev, i) => {
      lines.push(`\n**Evidence ${i + 1}**`);
      lines.push(`- URL: ${ev.url}`);
      if (ev.title)      lines.push(`- Title: ${ev.title}`);
      if (ev.platform)   lines.push(`- Platform: ${ev.platform}`);
      if (ev.signalType) lines.push(`- Signal type: ${ev.signalType}`);
      if (ev.author)     lines.push(`- Author: ${ev.author}`);
      if (ev.summary)    lines.push(`- Summary: ${ev.summary}`);
    });
  }

  // Notes (research notes only — status notes are internal workflow)
  const researchNotes = input.notes.filter(n => n.noteType === "research");
  if (researchNotes.length > 0) {
    lines.push("\n### Research Notes");
    researchNotes.forEach((n, i) => {
      lines.push(`\n**Note ${i + 1}** (${n.createdAt.slice(0, 10)})`);
      lines.push(n.body);
    });
  }

  // Dimension scoring guide
  lines.push("\n---\n## Scoring Guide\n");
  RUBRIC_DIMENSIONS.forEach(dim => {
    lines.push(`### ${dim.label} (weight ${dim.weight})`);
    lines.push(dim.description);
    lines.push("");
  });

  lines.push("---");
  lines.push("Return only the JSON object described in your instructions. No other text.");

  return lines.join("\n");
}

// ── URL allowlist enforcement ──────────────────────────────────────────────────
// Claude may only cite URLs that were supplied in the evidence list.

function filterToSuppliedUrls(
  claimedUrls: string[],
  suppliedUrls: Set<string>
): string[] {
  return claimedUrls.filter(u => suppliedUrls.has(u));
}

// ── Response → EvaluationScorecard ───────────────────────────────────────────

function buildScorecard(raw: ClaudeResponse): EvaluationScorecard {
  const dims = raw.dimensions;

  function toDimension(key: DimensionKey): RubricDimension {
    const def    = RUBRIC_DIMENSIONS.find(d => d.key === key)!;
    const raw_d  = dims[key];
    return {
      score:         raw_d.score,
      weight:        def.weight,
      weightedScore: computeWeightedScore(raw_d.score, def.weight),
      justification: raw_d.justification,
    };
  }

  const rawScores: Record<DimensionKey, number> = {
    problemSeverityFrequency: dims.problemSeverityFrequency.score,
    evidenceStrength:         dims.evidenceStrength.score,
    willingnessToPay:         dims.willingnessToPay.score,
    founderMarketFit:         dims.founderMarketFit.score,
    customerAccessDistrib:    dims.customerAccessDistrib.score,
    solopreneurFeasibility:   dims.solopreneurFeasibility.score,
    speedToValidation:        dims.speedToValidation.score,
    marketExpansionPotential: dims.marketExpansionPotential.score,
    differentiation:          dims.differentiation.score,
  };

  return {
    problemSeverityFrequency: toDimension("problemSeverityFrequency"),
    evidenceStrength:         toDimension("evidenceStrength"),
    willingnessToPay:         toDimension("willingnessToPay"),
    founderMarketFit:         toDimension("founderMarketFit"),
    customerAccessDistrib:    toDimension("customerAccessDistrib"),
    solopreneurFeasibility:   toDimension("solopreneurFeasibility"),
    speedToValidation:        toDimension("speedToValidation"),
    marketExpansionPotential: toDimension("marketExpansionPotential"),
    differentiation:          toDimension("differentiation"),
    totalScore:               computeTotalScore(rawScores),
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Evaluate an opportunity against the V0.1 rubric using Claude.
 *
 * @throws Error if the API call fails, the response is not valid JSON,
 *         or Zod validation fails. Callers must wrap in try/catch.
 */
export async function evaluateOpportunity(
  input: EvaluationInput
): Promise<OpportunityEvaluation> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const client = new Anthropic({ apiKey });

  const userPrompt = buildUserPrompt(input);

  const response = await client.messages.create({
    model:      MODEL,
    max_tokens: 4096,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: "user", content: userPrompt }],
  });

  // Extract text content
  const textBlock = response.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content");
  }

  const rawText = textBlock.text.trim();

  // Strip markdown code fences if Claude wrapped the JSON despite instructions
  const jsonText = rawText.startsWith("```")
    ? rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()
    : rawText;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Claude response is not valid JSON. Raw: ${rawText.slice(0, 300)}`);
  }

  const validated = ClaudeResponseSchema.safeParse(parsed);
  if (!validated.success) {
    const issues = validated.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Claude response failed validation: ${issues}`);
  }

  const raw = validated.data;

  // Build application-side scorecard (weighted scores computed here, not by Claude)
  const scorecard = buildScorecard(raw);
  const totalScore = scorecard.totalScore;
  const decision   = scoreToDecision(totalScore);

  // Enforce URL allowlist — only URLs we supplied can appear in the output
  const suppliedUrls = new Set(input.evidence.map(e => e.url));
  const filteredUrls = filterToSuppliedUrls(raw.evidenceUrlsUsed, suppliedUrls);

  const now = new Date().toISOString();

  const narrative: EvaluationNarrative = {
    confidence:         raw.confidence,
    evidenceUrlsUsed:   filteredUrls,
    factsVsAssumptions: raw.factsVsAssumptions,
    missingEvidence:    raw.missingEvidence,
    strongestObjection: raw.strongestObjection,
    cheapestExperiment: raw.cheapestExperiment,
    estimatedTimeCost:  raw.estimatedTimeCost,
  };

  const evaluation: OpportunityEvaluation = {
    scorecard,
    narrative,
    evaluatedAt: now,
    modelUsed:   MODEL,
  };

  // Sanity guard: "Build" must never be returned
  if (decision === ("Build" as string)) {
    throw new Error("Internal: scoreToDecision returned Build — this must never happen");
  }

  return evaluation;
}
