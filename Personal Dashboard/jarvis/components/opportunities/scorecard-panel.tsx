/**
 * components/opportunities/scorecard-panel.tsx
 *
 * Read-only display of a persisted AI evaluation (V0.1 rubric).
 * Parses the JSON scorecard blob from OpportunityRow and renders:
 *   - total score / 100 with colour-coded bar
 *   - recommendation badge and confidence
 *   - all 9 dimensions: raw score, mini-bar, weight, weighted score
 *   - dimension justification visible on row hover
 *   - strongest objection, cheapest experiment, estimated cost, model
 *
 * Shows a clear "not yet evaluated" state when evalScore is null.
 * Advisory only — no lifecycle or checklist state is read or modified here.
 */

import { cn } from "@/lib/utils";
import type { OpportunityRow } from "@/lib/db/schema";
import type { OpportunityEvaluation } from "@/lib/types";

// ── Dimension display config ───────────────────────────────────────────────────

const DIM_ORDER = [
  "problemSeverityFrequency",
  "evidenceStrength",
  "willingnessToPay",
  "founderMarketFit",
  "customerAccessDistrib",
  "solopreneurFeasibility",
  "speedToValidation",
  "marketExpansionPotential",
  "differentiation",
] as const;

type DimKey = typeof DIM_ORDER[number];

const DIM_LABELS: Record<DimKey, string> = {
  problemSeverityFrequency: "Problem Severity",
  evidenceStrength:         "Evidence Strength",
  willingnessToPay:         "Willingness to Pay",
  founderMarketFit:         "Founder–Market Fit",
  customerAccessDistrib:    "Customer Access",
  solopreneurFeasibility:   "Solopreneur Feasibility",
  speedToValidation:        "Speed to Validation",
  marketExpansionPotential: "Market Expansion",
  differentiation:          "Differentiation",
};

// ── Style helpers ──────────────────────────────────────────────────────────────

function recommendationStyle(rec: string) {
  switch (rec) {
    case "Validate Now":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "Investigate":
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "Watch":
      return "text-muted-foreground bg-secondary/50 border-border";
    default: // Reject
      return "text-red-400 bg-red-500/10 border-red-500/20";
  }
}

function scoreFill(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 65) return "bg-amber-400";
  if (score >= 45) return "bg-yellow-600";
  return "bg-red-500";
}

function dimBarColor(rawScore: number): string {
  if (rawScore >= 8) return "bg-emerald-500/70";
  if (rawScore >= 5) return "bg-amber-400/70";
  return "bg-red-500/50";
}

function confidenceStyle(confidence: string): string {
  switch (confidence) {
    case "high":   return "text-emerald-400 bg-emerald-500/10";
    case "medium": return "text-amber-400 bg-amber-500/10";
    default:       return "text-muted-foreground bg-secondary/50";
  }
}

function formatEvalDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ScorecardPanel({ opp }: { opp: OpportunityRow }) {
  // ── Unevaluated state ────────────────────────────────────────────────────────
  if (opp.evalScore === null) {
    return (
      <div className="pt-3 border-t border-border space-y-1.5">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
          AI Evaluation
        </p>
        <p className="text-xs text-muted-foreground/50 italic">
          Not yet evaluated — run an evaluation to score this opportunity against the V0.1 rubric.
        </p>
      </div>
    );
  }

  // ── Parse scorecard blob ─────────────────────────────────────────────────────
  let evaluation: OpportunityEvaluation | null = null;
  if (opp.scorecard) {
    try {
      evaluation = JSON.parse(opp.scorecard) as OpportunityEvaluation;
    } catch {
      // Render partial view from top-level columns only
    }
  }

  const totalScore = opp.evalScore;
  const rec        = opp.recommendation ?? "—";

  return (
    <div className="pt-3 border-t border-border space-y-4">

      {/* ── Section header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
          AI Evaluation
        </p>
        {opp.evaluatedAt && (
          <p className="text-[10px] text-muted-foreground/50 font-mono">
            {formatEvalDate(opp.evaluatedAt)}
            {evaluation && (
              <span className="ml-1.5 opacity-60">· {evaluation.modelUsed}</span>
            )}
          </p>
        )}
      </div>

      {/* ── Score + recommendation ───────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          {/* Score numeral + recommendation badge */}
          <div className="flex items-center gap-2.5">
            <span className="text-2xl font-bold font-mono tabular-nums text-foreground leading-none">
              {totalScore}
            </span>
            <span className="text-sm text-muted-foreground/40 leading-none">/100</span>
            <span
              className={cn(
                "text-[11px] font-medium px-2 py-0.5 rounded border",
                recommendationStyle(rec)
              )}
            >
              {rec}
            </span>
          </div>

          {/* Confidence */}
          {evaluation && (
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded",
                confidenceStyle(evaluation.narrative.confidence)
              )}
            >
              {evaluation.narrative.confidence} confidence
            </span>
          )}
        </div>

        {/* Score bar — colour-coded by threshold band */}
        <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", scoreFill(totalScore))}
            style={{ width: `${totalScore}%` }}
          />
        </div>
        {/* Threshold labels */}
        <div className="flex text-[9px] text-muted-foreground/30">
          <span className="flex-1 text-left">0</span>
          <span style={{ flexBasis: "10%" }} className="text-center">45</span>
          <span style={{ flexBasis: "15%" }} className="text-center">65</span>
          <span style={{ flexBasis: "15%" }} className="text-center">80</span>
          <span className="flex-1 text-right">100</span>
        </div>
      </div>

      {/* ── Dimension scores ─────────────────────────────────────────────────── */}
      {evaluation && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Dimension Scores
          </p>

          <div className="space-y-0.5">
            {DIM_ORDER.map((key) => {
              const dim = evaluation!.scorecard[key];
              if (!dim) return null;
              return (
                <div key={key} className="py-1 space-y-0.5">
                  {/* Score row */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-36 flex-shrink-0 truncate leading-none">
                      {DIM_LABELS[key]}
                    </span>
                    {/* Mini bar */}
                    <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", dimBarColor(dim.score))}
                        style={{ width: `${dim.score * 10}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-foreground w-8 text-right flex-shrink-0">
                      {dim.score}/10
                    </span>
                    <span className="text-[10px] text-muted-foreground/40 w-7 text-right flex-shrink-0">
                      ×{dim.weight}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground/60 w-8 text-right flex-shrink-0">
                      {dim.weightedScore.toFixed(1)}
                    </span>
                  </div>
                  {/* Justification — always visible */}
                  <p className="text-[10px] text-muted-foreground/50 leading-snug pl-[9.5rem]">
                    {dim.justification}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Weighted total row */}
          <div className="flex items-center gap-2 pt-1 border-t border-border px-1">
            <span className="text-[11px] text-muted-foreground w-36 flex-shrink-0">
              Total
            </span>
            <div className="flex-1" />
            <span className="font-mono text-[11px] font-semibold text-foreground w-8 text-right flex-shrink-0">
            </span>
            <span className="text-[10px] text-muted-foreground/40 w-7 flex-shrink-0" />
            <span className="font-mono text-[11px] font-semibold text-foreground w-8 text-right flex-shrink-0">
              {evaluation.scorecard.totalScore.toFixed(1)}
            </span>
          </div>
        </div>
      )}

      {/* ── Narrative ────────────────────────────────────────────────────────── */}
      {evaluation && (
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Strongest Objection
            </p>
            <p className="text-xs text-foreground leading-relaxed">
              {evaluation.narrative.strongestObjection}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Cheapest Experiment
            </p>
            <p className="text-xs text-foreground leading-relaxed">
              {evaluation.narrative.cheapestExperiment}
            </p>
            <p className="text-[11px] text-muted-foreground/50 font-mono">
              {evaluation.narrative.estimatedTimeCost}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
