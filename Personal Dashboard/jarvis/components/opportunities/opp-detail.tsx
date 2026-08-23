"use client";

import { useState } from "react";
import {
  X,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Circle,
  FlaskConical,
  Minus,
  Plus,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  OpportunityRecord,
  OpportunityStatus,
  SignalType,
  DetailedScorecard,
  CompetitiveAlternative,
  ValidationChecklist,
} from "@/lib/types";
import {
  STATUS_CONFIG,
  LIFECYCLE_STEPS,
  LIFECYCLE_ORDER,
} from "@/lib/opportunity-lifecycle";

export { STATUS_CONFIG };

function getLifecycleIndex(status: OpportunityStatus): number {
  if (status === "rejected" || status === "archived" || status === "watch")
    return -1;
  return LIFECYCLE_ORDER.indexOf(status);
}

// ── Signal type config ─────────────────────────────────────────────────────────

const SIGNAL_TYPE_CONFIG: Record<
  SignalType,
  { label: string; color: string }
> = {
  complaint: { label: "Complaint", color: "text-red-400 bg-red-500/8" },
  request: { label: "Request", color: "text-blue-400 bg-blue-500/8" },
  workaround: {
    label: "Workaround",
    color: "text-amber-400 bg-amber-500/8",
  },
  "spending-intent": {
    label: "Spending Intent",
    color: "text-emerald-400 bg-emerald-500/8",
  },
  "competitor-dissatisfaction": {
    label: "Competitor Gap",
    color: "text-orange-400 bg-orange-500/8",
  },
  "repeated-manual-workflow": {
    label: "Manual Workflow",
    color: "text-violet-400 bg-violet-500/8",
  },
};

// ── Score bar ──────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color =
    score >= 7
      ? "bg-emerald-500"
      : score >= 5
      ? "bg-amber-500"
      : "bg-red-500/70";
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "font-mono text-xs w-5 text-right flex-shrink-0",
          score >= 7
            ? "text-emerald-400"
            : score >= 5
            ? "text-amber-400"
            : "text-red-400"
        )}
      >
        {score}
      </span>
    </div>
  );
}

// ── Scorecard section ──────────────────────────────────────────────────────────

const SCORECARD_ROWS: {
  key: keyof Omit<DetailedScorecard, "overall" | "weightedNote">;
  label: string;
  note?: string;
}[] = [
  { key: "painSeverity", label: "Pain severity" },
  { key: "frequency", label: "Problem frequency" },
  { key: "willingnessToPay", label: "Willingness to pay" },
  { key: "founderFit", label: "Founder fit" },
  { key: "customerReach", label: "Customer reach" },
  { key: "speedToValidate", label: "Speed to validate" },
  {
    key: "competitionIntensity",
    label: "Competition",
    note: "10 = open market",
  },
  {
    key: "platformRisk",
    label: "Platform risk",
    note: "10 = no dependency",
  },
  { key: "defensibility", label: "Defensibility" },
  { key: "revenuePotential", label: "Revenue potential" },
];

function ScorecardTab({ scorecard }: { scorecard: DetailedScorecard }) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      {SCORECARD_ROWS.map(({ key, label, note }) => {
        const dim = scorecard[key];
        const isOpen = expandedRow === key;
        return (
          <div key={key} className="border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setExpandedRow(isOpen ? null : key)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/30 transition-colors"
            >
              <span className="text-xs text-muted-foreground w-36 flex-shrink-0">
                {label}
                {note && (
                  <span className="text-[10px] text-muted-foreground/50 ml-1">
                    ({note})
                  </span>
                )}
              </span>
              <ScoreBar score={dim.score} />
              <ChevronRight
                className={cn(
                  "w-3 h-3 text-muted-foreground/50 flex-shrink-0 transition-transform",
                  isOpen && "rotate-90"
                )}
              />
            </button>
            {isOpen && (
              <div className="border-t border-border px-3 py-2.5 bg-background">
                <p className="text-xs text-muted-foreground/80 leading-relaxed">
                  {dim.justification}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Overall */}
      <div className="mt-4 border border-primary/20 rounded-md px-4 py-3 bg-primary/4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground uppercase tracking-widest">
            Overall
          </span>
          <span className="font-mono text-lg font-bold text-primary">
            {scorecard.overall.toFixed(1)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {scorecard.weightedNote}
        </p>
      </div>
    </div>
  );
}

// ── Validation checklist ───────────────────────────────────────────────────────

function BoolChecklistItem({
  done,
  label,
  sub,
  onClick,
}: {
  done: boolean;
  label: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-2.5 text-left hover:bg-secondary/20 rounded px-1 py-0.5 -mx-1 transition-colors"
    >
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
      ) : (
        <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
      )}
      <div>
        <span className={cn("text-xs", done ? "text-foreground" : "text-muted-foreground")}>
          {label}
        </span>
        {sub && (
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</p>
        )}
      </div>
    </button>
  );
}

function CountChecklistItem({
  value,
  max,
  label,
  onDecrement,
  onIncrement,
}: {
  value: number;
  max: number;
  label: string;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  const done = value >= max;
  return (
    <div className="flex items-center gap-2.5">
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
      )}
      <span className={cn("text-xs flex-1", done ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={onDecrement}
          disabled={value <= 0}
          className="w-5 h-5 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 transition-colors"
        >
          <Minus className="w-2.5 h-2.5" />
        </button>
        <span className="font-mono text-xs text-foreground w-8 text-center">
          {value}/{max}
        </span>
        <button
          onClick={onIncrement}
          disabled={value >= max}
          className="w-5 h-5 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 transition-colors"
        >
          <Plus className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}

function ValidationChecklistSection({
  checklist,
  onChecklistChange,
}: {
  checklist: ValidationChecklist;
  onChecklistChange: (field: keyof ValidationChecklist, value: boolean | number) => void;
}) {
  return (
    <div className="space-y-3">
      <BoolChecklistItem
        done={checklist.usersIdentified}
        label="10 target users identified"
        onClick={() => onChecklistChange("usersIdentified", !checklist.usersIdentified)}
      />
      <CountChecklistItem
        value={checklist.conversationsCompleted}
        max={5}
        label="Conversations completed"
        onDecrement={() =>
          onChecklistChange("conversationsCompleted", Math.max(0, checklist.conversationsCompleted - 1))
        }
        onIncrement={() =>
          onChecklistChange("conversationsCompleted", Math.min(5, checklist.conversationsCompleted + 1))
        }
      />
      <CountChecklistItem
        value={checklist.problemConfirmed}
        max={3}
        label="Users confirmed the problem"
        onDecrement={() =>
          onChecklistChange("problemConfirmed", Math.max(0, checklist.problemConfirmed - 1))
        }
        onIncrement={() =>
          onChecklistChange("problemConfirmed", Math.min(3, checklist.problemConfirmed + 1))
        }
      />
      <CountChecklistItem
        value={checklist.solutionRequested}
        max={2}
        label="Users asked for the solution"
        onDecrement={() =>
          onChecklistChange("solutionRequested", Math.max(0, checklist.solutionRequested - 1))
        }
        onIncrement={() =>
          onChecklistChange("solutionRequested", Math.min(2, checklist.solutionRequested + 1))
        }
      />
      <BoolChecklistItem
        done={checklist.willingnessToPaySignal}
        label="1 willingness-to-pay signal captured"
        sub="Unprompted price mention, competitor spend disclosed, or pilot offer accepted"
        onClick={() =>
          onChecklistChange("willingnessToPaySignal", !checklist.willingnessToPaySignal)
        }
      />
      <BoolChecklistItem
        done={checklist.workaroundDocumented}
        label="Competing workaround documented"
        sub="What do people use today? Why is it not good enough?"
        onClick={() =>
          onChecklistChange("workaroundDocumented", !checklist.workaroundDocumented)
        }
      />
    </div>
  );
}

// ── Alternative type badge ─────────────────────────────────────────────────────

const ALT_TYPE_CONFIG: Record<
  CompetitiveAlternative["type"],
  { label: string; color: string }
> = {
  competitor: { label: "Competitor", color: "text-red-400 bg-red-500/8" },
  workaround: { label: "Workaround", color: "text-amber-400 bg-amber-500/8" },
  incumbent: { label: "Incumbent", color: "text-orange-400 bg-orange-500/8" },
  "do-nothing": {
    label: "Do nothing",
    color: "text-muted-foreground bg-secondary/60",
  },
};

// ── Lifecycle transitions (imported from shared module) ───────────────────────

import { TRANSITIONS } from "@/lib/opportunity-lifecycle";

// ── Main detail panel ──────────────────────────────────────────────────────────

interface OppDetailProps {
  opp: OpportunityRecord;
  onClose: () => void;
  note?: { rejectionReason?: string; watchNote?: string };
  onStatusChange: (
    status: OpportunityStatus,
    opts?: { rejectionReason?: string; watchNote?: string }
  ) => void;
  onChecklistChange: (field: keyof ValidationChecklist, value: boolean | number) => void;
}

export function OppDetail({ opp, onClose, note, onStatusChange, onChecklistChange }: OppDetailProps) {
  const [pendingStatus, setPendingStatus] = useState<OpportunityStatus | null>(null);
  const [noteText, setNoteText] = useState("");

  const statusCfg = STATUS_CONFIG[opp.status];
  const lifecycleIdx = getLifecycleIndex(opp.status);
  const isTerminal =
    opp.status === "rejected" ||
    opp.status === "archived" ||
    opp.status === "watch";

  const transitions = TRANSITIONS[opp.status] ?? [];
  const pendingTransition = pendingStatus
    ? transitions.find((t) => t.targetStatus === pendingStatus) ?? null
    : null;

  function commitTransition() {
    if (!pendingStatus) return;
    const opts: { rejectionReason?: string; watchNote?: string } = {};
    if (pendingStatus === "rejected" && noteText.trim()) opts.rejectionReason = noteText.trim();
    if (pendingStatus === "watch" && noteText.trim()) opts.watchNote = noteText.trim();
    onStatusChange(pendingStatus, opts);
    setPendingStatus(null);
    setNoteText("");
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />

      <div className="w-[680px] h-full bg-card border-l border-border flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded",
                    statusCfg.bg,
                    statusCfg.color
                  )}
                >
                  {statusCfg.label}
                </span>
                <span className="text-[10px] text-amber-500/70 bg-amber-500/8 px-2 py-0.5 rounded flex items-center gap-1">
                  <FlaskConical className="w-3 h-3" />
                  Demo data
                </span>
              </div>
              <h2 className="text-base font-semibold text-foreground leading-snug">
                {opp.title}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {opp.problemStatement}
              </p>
            </div>
            <div className="flex items-start gap-3 flex-shrink-0">
              <div className="text-right">
                <p className="font-mono text-2xl font-bold text-primary">
                  {opp.scorecard.overall.toFixed(1)}
                </p>
                <p className="text-[10px] text-muted-foreground">/10</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lifecycle bar */}
          {!isTerminal ? (
            <div className="flex items-center gap-0">
              {LIFECYCLE_STEPS.map((step, i) => {
                const isDone = lifecycleIdx > i;
                const isCurrent = lifecycleIdx === i;
                const isLast = i === LIFECYCLE_STEPS.length - 1;
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          isDone
                            ? "bg-primary"
                            : isCurrent
                            ? "bg-primary ring-2 ring-primary/30"
                            : "bg-border"
                        )}
                      />
                      <span
                        className={cn(
                          "text-[9px] mt-1 text-center leading-tight",
                          isCurrent
                            ? "text-primary font-medium"
                            : isDone
                            ? "text-muted-foreground"
                            : "text-muted-foreground/40"
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div
                        className={cn(
                          "flex-1 h-px mx-0.5 mb-4",
                          isDone ? "bg-primary/40" : "bg-border"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className={cn(
                "text-xs px-3 py-2 rounded space-y-0.5",
                opp.status === "rejected"
                  ? "bg-red-500/8 text-red-400"
                  : "bg-secondary/50 text-muted-foreground"
              )}
            >
              <span className="font-medium">
                {opp.status === "rejected" ? "Rejected" : opp.status === "watch" ? "Watching" : "Archived"}
                {" · "}
              </span>
              {opp.recommendationReason}
              {note?.rejectionReason && (
                <p className="mt-1 text-red-400/70 italic">&ldquo;{note.rejectionReason}&rdquo;</p>
              )}
              {note?.watchNote && (
                <p className="mt-1 text-muted-foreground/70 italic">&ldquo;{note.watchNote}&rdquo;</p>
              )}
            </div>
          )}

          {/* Status control */}
          {transitions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {transitions.map((t) => (
                  <button
                    key={t.targetStatus}
                    onClick={() => {
                      if (t.requiresNote || t.requiresConfirm) {
                        setPendingStatus(t.targetStatus);
                        setNoteText("");
                      } else {
                        onStatusChange(t.targetStatus);
                      }
                    }}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded border transition-all",
                      t.variant === "primary" &&
                        "bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary",
                      t.variant === "secondary" &&
                        "bg-secondary/60 hover:bg-secondary border-border text-muted-foreground hover:text-foreground",
                      t.variant === "danger" &&
                        "bg-red-500/8 hover:bg-red-500/15 border-red-500/20 text-red-400"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {pendingStatus && (
                <div className="border border-border rounded-md p-3 bg-background space-y-2">
                  {pendingTransition?.requiresNote && (
                    <>
                      <p className="text-[11px] text-muted-foreground">
                        {pendingStatus === "rejected"
                          ? "Rejection reason (optional)"
                          : "Watch note (optional)"}
                      </p>
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder={
                          pendingStatus === "rejected"
                            ? "Why is this being rejected?"
                            : "What signal would change your mind?"
                        }
                        rows={2}
                        className="w-full bg-transparent border border-border rounded text-xs text-foreground p-2 resize-none placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
                      />
                    </>
                  )}
                  {pendingTransition?.requiresConfirm && !pendingTransition.requiresNote && (
                    <p className="text-xs text-muted-foreground">
                      Move to{" "}
                      <span className="text-emerald-400 font-medium">Build</span>? This signals
                      you&apos;re committed to building this.
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={commitTransition}
                      className="px-3 py-1 text-xs font-medium bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded transition-all"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => { setPendingStatus(null); setNoteText(""); }}
                      className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground/40">Session only — not persisted</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="thesis" className="flex-1 flex flex-col min-h-0">
          <TabsList className="px-6 py-0 h-10 bg-transparent border-b border-border rounded-none gap-0 justify-start flex-shrink-0">
            {[
              ["thesis", "Thesis"],
              ["evidence", `Evidence (${opp.signals.length})`],
              ["scorecard", "Scorecard"],
              ["alternatives", "Alternatives"],
              ["action", "Action Plan"],
            ].map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground px-4 h-full"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Thesis tab ──────────────────────────────────────────────────── */}
          <TabsContent value="thesis" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              <div className="px-6 py-5 space-y-5">
                {[
                  {
                    label: "What is the problem?",
                    content: opp.thesis.problem,
                  },
                  {
                    label: "Who experiences it?",
                    content: opp.thesis.whoExperiencesIt,
                  },
                  {
                    label: "Why does it hurt?",
                    content: opp.thesis.whyItHurts,
                  },
                  {
                    label: "Why might they pay?",
                    content: opp.thesis.whyTheyMightPay,
                  },
                  { label: "Why now?", content: opp.thesis.whyNow },
                ].map(({ label, content }) => (
                  <div key={label} className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      {label}
                    </p>
                    <p className="text-xs text-foreground/85 leading-relaxed">
                      {content}
                    </p>
                  </div>
                ))}

                <div className="border-t border-border pt-4 space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Target customer
                  </p>
                  <p className="text-xs text-foreground/85">{opp.targetCustomer}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {opp.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Evidence tab ────────────────────────────────────────────────── */}
          <TabsContent value="evidence" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              <div className="px-6 py-5 space-y-4">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Each signal below represents an independent data point from a
                  real (or future) source. Signal count is a proxy for
                  confidence — the more independent sources confirm the same
                  pain, the more real it is.
                </p>
                {opp.signals.map((signal) => {
                  const typeCfg = SIGNAL_TYPE_CONFIG[signal.signalType];
                  return (
                    <div
                      key={signal.id}
                      className="border border-border rounded-md p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold text-primary/80 bg-primary/8 px-1.5 py-0.5 rounded">
                            {signal.platform}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded",
                              typeCfg.color
                            )}
                          >
                            {typeCfg.label}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground/60 flex-shrink-0">
                          {signal.date}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-foreground leading-snug">
                        {signal.title}
                      </p>
                      {signal.author && (
                        <p className="text-[11px] text-muted-foreground/60">
                          {signal.author}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {signal.summary}
                      </p>
                      {signal.url ? (
                        <a
                          href={signal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View source
                        </a>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/40">
                          Source URL: not yet captured (demo mode)
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Scorecard tab ────────────────────────────────────────────────── */}
          <TabsContent value="scorecard" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              <div className="px-6 py-5">
                <p className="text-[10px] text-muted-foreground mb-4 leading-relaxed">
                  Scores are decision-support signals, not objective truth.
                  Click any row to see the reasoning behind the score.
                </p>
                <ScorecardTab scorecard={opp.scorecard} />
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Alternatives tab ─────────────────────────────────────────────── */}
          <TabsContent value="alternatives" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              <div className="px-6 py-5 space-y-3">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  What do people do today instead of using your product? Every
                  gap below is a potential positioning hook.
                </p>
                {opp.alternatives.map((alt, i) => {
                  const altCfg = ALT_TYPE_CONFIG[alt.type];
                  return (
                    <div
                      key={i}
                      className="border border-border rounded-md p-4 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-foreground flex-1">
                          {alt.name}
                        </p>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded flex-shrink-0",
                            altCfg.color
                          )}
                        >
                          {altCfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="text-muted-foreground/60">Gap: </span>
                        {alt.gap}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Action Plan tab ──────────────────────────────────────────────── */}
          <TabsContent value="action" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              <div className="px-6 py-5 space-y-6">
                {/* Recommendation */}
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Recommendation
                  </p>
                  <div
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-md",
                      opp.recommendation === "Validate Now"
                        ? "bg-violet-500/10 border border-violet-500/20"
                        : opp.recommendation === "Investigate"
                        ? "bg-amber-500/10 border border-amber-500/20"
                        : opp.recommendation === "Watch"
                        ? "bg-secondary/60 border border-border"
                        : "bg-red-500/10 border border-red-500/20"
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        opp.recommendation === "Validate Now"
                          ? "text-violet-400"
                          : opp.recommendation === "Investigate"
                          ? "text-amber-400"
                          : opp.recommendation === "Watch"
                          ? "text-muted-foreground"
                          : "text-red-400"
                      )}
                    >
                      {opp.recommendation}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {opp.recommendationReason}
                  </p>
                </div>

                {/* Validation checklist (if validating) */}
                {opp.validationChecklist && (
                  <div className="space-y-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Validation checklist
                    </p>
                    <ValidationChecklistSection
                      checklist={opp.validationChecklist}
                      onChecklistChange={onChecklistChange}
                    />
                  </div>
                )}

                {/* Validation plan (if available) */}
                {opp.validationPlan && (
                  <div className="space-y-4 border-t border-border pt-5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Validation plan
                    </p>

                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground">
                        Target persona
                      </p>
                      <p className="text-xs text-foreground/85 leading-relaxed">
                        {opp.validationPlan.targetPersona}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground">
                        5 people to find
                      </p>
                      <div className="space-y-1.5">
                        {opp.validationPlan.peopleToFind.map((p, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-xs text-foreground/80 leading-relaxed"
                          >
                            <span className="font-mono text-muted-foreground/50 flex-shrink-0 mt-0.5">
                              {i + 1}.
                            </span>
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground">
                        3 interview questions
                      </p>
                      <div className="space-y-2">
                        {opp.validationPlan.interviewQuestions.map((q, i) => (
                          <div
                            key={i}
                            className="bg-background border border-border rounded px-3 py-2.5 flex items-start gap-2"
                          >
                            <span className="font-mono text-[10px] text-muted-foreground/50 flex-shrink-0 mt-0.5">
                              Q{i + 1}
                            </span>
                            <p className="text-xs text-foreground/80 leading-relaxed">
                              {q}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {[
                        {
                          label: "Smallest prototype / test",
                          content: opp.validationPlan.smallestPrototype,
                        },
                        {
                          label: "Strongest assumption to test",
                          content: opp.validationPlan.strongestAssumption,
                        },
                        {
                          label: "Success signal (go)",
                          content: opp.validationPlan.successSignal,
                          color: "text-emerald-400",
                        },
                        {
                          label: "Kill signal (stop)",
                          content: opp.validationPlan.killSignal,
                          color: "text-red-400",
                        },
                      ].map(({ label, content, color }) => (
                        <div
                          key={label}
                          className="bg-background border border-border rounded-md px-3 py-3 space-y-1.5"
                        >
                          <p
                            className={cn(
                              "text-[10px] uppercase tracking-widest",
                              color ?? "text-muted-foreground"
                            )}
                          >
                            {label}
                          </p>
                          <p className="text-xs text-foreground/80 leading-relaxed">
                            {content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!opp.validationPlan && (
                  <p className="text-xs text-muted-foreground/60 italic">
                    Validation plan not yet created for this opportunity.
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
