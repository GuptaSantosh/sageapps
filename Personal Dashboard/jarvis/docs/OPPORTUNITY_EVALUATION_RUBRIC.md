# Opportunity Evaluation Rubric V0.1

> **Canonical reference.** All evaluation design decisions — dimensions, weights,
> scoring mechanics, output schema, decision thresholds, and implementation
> constraints — are recorded here. Do not re-derive or re-litigate these decisions
> from first principles. Update this document when any decision changes.

## Purpose

Evaluate manually captured opportunities consistently so Santosh can decide which
ideas deserve further investigation, validation, or rejection.

The rubric does not replace Santosh's judgement. It surfaces evidence quality,
scores each dimension transparently, and suggests a decision. All lifecycle
transitions remain manual.

---

## Dimensions and Weights

| # | Dimension | Weight | What it measures |
|---|---|---|---|
| 1 | Problem Severity & Frequency | 15 | How acutely and how often the target customer experiences this problem |
| 2 | Evidence Strength | 15 | Quality and volume of real-world signals (complaints, workarounds, spending) backing the problem claim |
| 3 | Willingness to Pay | 15 | Evidence that users pay (or have paid) for solutions to this class of problem |
| 4 | Founder–Market Fit | 15 | Santosh's genuine edge: fintech expertise, India distribution, 18yr S&P/NIT/IIM network |
| 5 | Customer Access / Distribution | 10 | How easily Santosh can reach and acquire the first 100 customers |
| 6 | Solopreneur Feasibility | 10 | Whether the product can be built and operated by one person to meaningful revenue |
| 7 | Speed to Validation | 10 | How quickly a cheap test (landing page, prototype, interview sprint) can yield a go/no-go signal |
| 8 | Market Expansion Potential | 5 | Whether the initial niche can expand to a meaningfully larger market over time |
| 9 | Differentiation | 5 | Existence of a credible gap vs. alternatives; defensibility once the product exists |
| | **Total** | **100** | |

---

## Scoring Mechanics

Claude scores each dimension from **0 to 10** (raw score).

Code computes the weighted contribution for each dimension:

```
weightedScore = rawScore / 10 × dimensionWeight
```

The total is the sum of all nine weighted scores (0–100).

Example: dimension weight 15, raw score 7 → weighted score = 7/10 × 15 = 10.5

---

## Decision Legend (advisory only)

| Total score | Suggested decision |
|---|---|
| 80–100 | Validate Now |
| 65–79 | Investigate |
| 45–64 | Watch |
| 0–44 | Reject |

**"Build" is never AI-awarded.** It requires validation evidence from the checklist
plus explicit Santosh approval via the manual lifecycle transition. The AI
suggestion is advisory input — it must never automatically change lifecycle status.

---

## Required Evaluation Output

Every evaluation must return all of the following fields. Partial evaluations are
rejected by the Zod validator at the server-action layer.

| Field | Type | Notes |
|---|---|---|
| Per-dimension raw score | integer 0–10 | One per each of the nine dimensions |
| Per-dimension justification | string | 1–2 sentences explaining the score |
| Total score | number | Sum of weightedScores (0–100) |
| Suggested decision | enum | `Validate Now` \| `Investigate` \| `Watch` \| `Reject` |
| Confidence | enum | `low` \| `medium` \| `high` |
| Evidence URLs used | string[] | Subset of the opportunity's evidence URLs that informed the evaluation |
| Facts vs assumptions | string | Explicit statement of what the AI treated as established fact vs what it assumed |
| Missing evidence | string[] | Specific data points whose presence would meaningfully change the score |
| Strongest objection | string | The single most important reason this idea might fail |
| Cheapest experiment | string | The lowest-cost test that could validate or kill the strongest assumption |
| Estimated time / cost | string | Human-readable estimate for the cheapest experiment (e.g. "2 weeks / ~₹5 000") |
| Model used | string | e.g. `claude-sonnet-4-6` |
| Evaluation timestamp | string | ISO 8601 UTC |

### Why facts, assumptions, and missing evidence matter

The POC is intended to evaluate **evidence quality**, not merely to generate an
opinion. The structured separation of facts from assumptions forces the AI to
distinguish between what the evidence actually shows and what it is inferring.
Missing evidence makes it explicit what additional research would change the
recommendation. Together these fields prevent the system from producing confident
scores on weak or absent evidence — which is the failure mode that makes AI
evaluation counterproductive.

---

## V0.1 Design Decisions

The following decisions are final for V0.1. Record changes here when the rubric
evolves.

| Decision | Choice | Rationale |
|---|---|---|
| Rubric location | Hardcoded in `lib/ai/rubric.ts` | Not database-editable in V1; no UI to configure weights yet |
| Evaluation availability | All lifecycle statuses | No restriction; Santosh may want a quick screen at `new` stage |
| Validation plan | Folded into `cheapestExperiment` | `ValidationPlan` JSON structure is deferred; the experiment field captures the essential output |
| Re-evaluation | Overwrites previous result | No history table in V1; last evaluation is the current evaluation |
| Response format | Structured JSON, validated with Zod | Reliable parsing; no ambiguity; Claude instructed via system prompt |
| Streaming | None | Single call completes in < 15 s; spinner is sufficient UX |
| Batch evaluation | Not implemented | One opportunity at a time; evaluate on demand |
| Scheduled evaluation | Not implemented | No cron or automated trigger in V1 |
| Multi-agent orchestration | Not implemented | Single Claude call; no tool use, no agents |
| Automatic lifecycle transitions | Prohibited | AI suggestion is advisory only; all transitions are manual |
| AI model | `claude-sonnet-4-6` | Quality / cost balance; swappable via `modelUsed` field |
| API key | `ANTHROPIC_API_KEY` env var | Server-only; never exposed to the client |
| `OpportunityRecommendation` type | `'Validate Now' \| 'Investigate' \| 'Watch' \| 'Reject'` | Renamed from legacy `'Ignore'` to `'Reject'` to match decision legend |

---

## Persistence Design

Evaluation results are persisted in the existing `opportunities` table:

| Column | Type | Content |
|---|---|---|
| `scorecard` | TEXT nullable | Full `OpportunityEvaluation` JSON (scorecard + narrative) |
| `recommendation` | TEXT nullable | Suggested decision string |
| `recommendation_reason` | TEXT nullable | 1–2 sentence summary |
| `eval_score` | INTEGER nullable | Total weighted score (0–100) — separate queryable column for sorting/filtering |
| `evaluated_at` | TEXT nullable | ISO 8601 UTC timestamp of last evaluation |

`eval_score` and `evaluated_at` are the only new columns required (schema migration
needed). All other columns exist in the current migration.

No separate evaluation-history table in V1. Re-evaluation overwrites these fields.

---

## Data Flow

```
Santosh clicks "Evaluate with AI"
  |
  v
evaluateOpportunityAction(opportunityId)   [Server Action — actions.ts]
  requireAuth()
  load opportunity + evidence + notes from DB
  |
  v
lib/ai/evaluate-opportunity.ts
  build prompt using lib/ai/rubric.ts (dimension definitions + weights)
  call Claude API (claude-sonnet-4-6), JSON output mode
  parse + validate response with Zod
  |
  v
updateEvaluation(id, EvaluationResult)     [queries.ts]
  writes: eval_score, evaluated_at, recommendation, recommendation_reason, scorecard
  revalidatePath("/opportunities")
  |
  v
ScorecardPanel (client component)
  displays: dimension bars, total, decision, confidence, all narrative fields
```

---

## Implementation Sequence

| Step | Scope | Status |
|---|---|---|
| **6.0** | Documentation + dead-code cleanup (`opp-detail.tsx`, `lib/opportunity-data.ts`, `lib/agents/opportunity-radar.ts`) | Next |
| **6.1** | Schema (2 new columns + migration), types (`EvaluationScorecard`, `EvaluationNarrative`, `OpportunityEvaluation`), query helper (`updateEvaluation`), stub server action | After 6.0 |
| **6.2** | Real AI evaluator: `@anthropic-ai/sdk`, `lib/ai/rubric.ts`, `lib/ai/evaluate-opportunity.ts`, wire `evaluateOpportunityAction` | After 6.1 |
| **6.3** | Scorecard UI: `components/opportunities/scorecard-panel.tsx`, render in `opportunities-client.tsx` | After 6.2 |

---

## Files Involved (Step 6 only)

### New files
| File | Purpose |
|---|---|
| `lib/ai/rubric.ts` | Nine dimension definitions with weights — single source of truth |
| `lib/ai/evaluate-opportunity.ts` | Prompt builder → Claude call → Zod parse → `OpportunityEvaluation` |
| `components/opportunities/scorecard-panel.tsx` | Client component: "Evaluate" button + spinner + full scorecard display |
| `migrations/NNNN_eval_columns.sql` | ALTER TABLE for `eval_score` + `evaluated_at` |

### Modified files
| File | Change |
|---|---|
| `lib/db/schema.ts` | Add `evalScore` (integer nullable) + `evaluatedAt` (text nullable) |
| `lib/db/queries.ts` | Add `UpdateEvaluationInput` + `updateEvaluation()` |
| `lib/types.ts` | Add `RubricDimension`, `EvaluationScorecard`, `EvaluationNarrative`, `OpportunityEvaluation`; rename `'Ignore'` → `'Reject'` in `OpportunityRecommendation` |
| `app/(private)/opportunities/actions.ts` | Add `evaluateOpportunityAction()` |
| `components/opportunities/opportunities-client.tsx` | Render `<ScorecardPanel>` in detail view |
| `package.json` / `package-lock.json` | Add `@anthropic-ai/sdk` |
| `.env.example` | Add `ANTHROPIC_API_KEY` |

### Files that must NOT be touched in Step 6
| File | Reason |
|---|---|
| `lib/opportunity-lifecycle.ts` | Lifecycle is fully independent of AI evaluation |
| `components/opportunities/lifecycle-panel.tsx` | Transition + checklist UI — no changes |
| `components/opportunities/opp-detail-panel.tsx` | Evidence + notes UI — no changes |
| `components/opportunities/opportunity-form.tsx` | Create/edit form — no changes |
| `auth.ts`, `proxy.ts`, `lib/auth-server.ts` | Auth — no changes |
| `next.config.ts` | CSP: API calls are server-to-server — no client CSP impact |
