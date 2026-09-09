/**
 * lib/ai/rubric.ts — Opportunity Evaluation Rubric V0.1
 *
 * Single source of truth for:
 *   - the 9 evaluation dimensions and their weights
 *   - dimension labels and descriptions (used in prompts and UI)
 *   - the decision thresholds
 *
 * Canonical design: docs/OPPORTUNITY_EVALUATION_RUBRIC.md
 * Do not modify weights or thresholds without updating that document first.
 *
 * Scoring formula:
 *   Claude scores each dimension 0–10 (raw).
 *   weightedScore = rawScore / 10 × weight.
 *   totalScore    = sum of all weightedScores  (0–100).
 *
 * "Build" is never returned as an AI recommendation.
 * All lifecycle transitions are manual.
 */

export type DimensionKey =
  | "problemSeverityFrequency"
  | "evidenceStrength"
  | "willingnessToPay"
  | "founderMarketFit"
  | "customerAccessDistrib"
  | "solopreneurFeasibility"
  | "speedToValidation"
  | "marketExpansionPotential"
  | "differentiation";

export interface RubricDimensionDef {
  key:         DimensionKey;
  label:       string;
  weight:      number;
  description: string;   // used verbatim in the evaluation prompt
}

export const RUBRIC_DIMENSIONS: RubricDimensionDef[] = [
  {
    key:    "problemSeverityFrequency",
    label:  "Problem Severity & Frequency",
    weight: 15,
    description:
      "How acute and how frequent is the pain? Score 9–10 only when the " +
      "problem causes significant recurring loss (time, money, risk) for the " +
      "target customer and occurs at least weekly. Score 1–3 when the problem " +
      "is a minor inconvenience or happens rarely. Generic, vague, or " +
      "aspirational problems score low even if the market is large.",
  },
  {
    key:    "evidenceStrength",
    label:  "Evidence Strength",
    weight: 15,
    description:
      "How strong and credible is the evidence supplied? Score 9–10 for " +
      "multiple independent real-world signals (complaints, workarounds, " +
      "actual spend) from named sources with URLs. Score 1–3 for anecdote, " +
      "assumption, or zero evidence. Do NOT infer evidence from general " +
      "market knowledge — only what is explicitly provided counts. If the " +
      "evidence section is empty, score 1.",
  },
  {
    key:    "willingnessToPay",
    label:  "Willingness to Pay",
    weight: 15,
    description:
      "Is there direct evidence that this customer segment pays for solutions " +
      "to this class of problem? Score 9–10 for existing paid products with " +
      "visible pricing, or customers explicitly stating budget. Score 1–3 " +
      "for assumed WTP with no supporting data. Never infer WTP from market " +
      "size or from the existence of free alternatives.",
  },
  {
    key:    "founderMarketFit",
    label:  "Founder–Market Fit",
    weight: 15,
    description:
      "Does Santosh Gupta have a credible, specific edge in this market? " +
      "Relevant context: 18+ years in fintech (S&P Global), deep India B2B " +
      "knowledge, NIT + IIM background, existing user base through MailSage / " +
      "FinSage / TaxSage, and strong AI-first product instincts. Score 9–10 " +
      "only when the opportunity directly leverages this background. Score " +
      "1–3 for domains where any competent developer could build the same " +
      "product without disadvantage.",
  },
  {
    key:    "customerAccessDistrib",
    label:  "Customer Access / Distribution",
    weight: 10,
    description:
      "How easily can Santosh find, reach, and convert the first 100 " +
      "customers without significant marketing spend? Score 9–10 for " +
      "communities Santosh already participates in or has direct access to. " +
      "Score 1–3 for customer segments that require cold outreach, " +
      "resellers, or enterprise sales.",
  },
  {
    key:    "solopreneurFeasibility",
    label:  "Solopreneur Feasibility",
    weight: 10,
    description:
      "Can this product be built and operated to meaningful recurring revenue " +
      "(₹5L+/month) by one person without a team? Consider: complexity of " +
      "the product surface, regulatory / compliance burden, customer support " +
      "demands, infrastructure cost, and operational overhead. Score 9–10 " +
      "for lightweight SaaS or tools. Score 1–3 for anything requiring a " +
      "team, significant capital, or high-touch service delivery.",
  },
  {
    key:    "speedToValidation",
    label:  "Speed to Validation",
    weight: 10,
    description:
      "How quickly can a cheap test (landing page, interview sprint, " +
      "prototype) produce a credible go/no-go signal? Score 9–10 when " +
      "meaningful signal is achievable in under 2 weeks for under ₹10 000. " +
      "Score 1–3 when validation requires months of development, regulatory " +
      "approval, or enterprise procurement cycles.",
  },
  {
    key:    "marketExpansionPotential",
    label:  "Market Expansion Potential",
    weight: 5,
    description:
      "Once the initial niche is captured, is there a credible path to a " +
      "larger addressable market? Score 9–10 for niches that are natural " +
      "entry points to much larger segments. Score 1–3 for permanently " +
      "small or highly fragmented markets with no obvious expansion vector.",
  },
  {
    key:    "differentiation",
    label:  "Differentiation",
    weight: 5,
    description:
      "Is there a credible reason customers would choose this over existing " +
      "alternatives? Consider: alternatives include do-nothing, spreadsheets, " +
      "workarounds, and existing SaaS — not just direct competitors. Score " +
      "9–10 for a strong structural advantage (distribution, data, UX, price, " +
      "integration). Score 1–3 for 'same as X but slightly better'.",
  },
];

// Total weight must equal 100.
export const TOTAL_WEIGHT = RUBRIC_DIMENSIONS.reduce((s, d) => s + d.weight, 0); // 100

// ── Decision thresholds ───────────────────────────────────────────────────────
// "Build" is intentionally absent — it is never AI-awarded.

export type EvalDecision = "Validate Now" | "Investigate" | "Watch" | "Reject";

export function scoreToDecision(totalScore: number): EvalDecision {
  if (totalScore >= 80) return "Validate Now";
  if (totalScore >= 65) return "Investigate";
  if (totalScore >= 45) return "Watch";
  return "Reject";
}

// ── Weighted score calculation ────────────────────────────────────────────────
// Application-side only. Claude's raw 0–10 scores are inputs; Claude must
// never be trusted to calculate the final weighted total.

export function computeWeightedScore(
  rawScore: number,
  weight: number
): number {
  return (rawScore / 10) * weight;
}

export function computeTotalScore(
  rawScores: Record<DimensionKey, number>
): number {
  return RUBRIC_DIMENSIONS.reduce((total, dim) => {
    return total + computeWeightedScore(rawScores[dim.key], dim.weight);
  }, 0);
}
