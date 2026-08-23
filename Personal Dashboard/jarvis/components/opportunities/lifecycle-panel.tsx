"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Minus, Plus, Loader2 } from "lucide-react";
import {
  updateOpportunityStatusAction,
  updateChecklistAction,
  getOpportunityAction,
} from "@/app/(private)/opportunities/actions";
import {
  TRANSITIONS,
  LIFECYCLE_STEPS,
  LIFECYCLE_ORDER,
  STATUS_CONFIG,
} from "@/lib/opportunity-lifecycle";
import { cn } from "@/lib/utils";
import type { OpportunityRow, ChecklistRow } from "@/lib/db/schema";
import type { OpportunityStatus } from "@/lib/types";

/**
 * Lifecycle progress bar, transition buttons, and (when status = "validating")
 * the validation checklist for a single opportunity.
 *
 * The parent renders this with key={`${opp.id}-${opp.status}`} so React
 * remounts it on both opportunity-selection change and after status transitions
 * (once router.refresh() delivers the updated status from the server).
 */
export function LifecyclePanel({ opp }: { opp: OpportunityRow }) {
  const router = useRouter();
  const status = opp.status as OpportunityStatus;
  const transitions = TRANSITIONS[status] ?? [];
  const lifecycleIdx = LIFECYCLE_ORDER.indexOf(status);
  const isOnMainPath = lifecycleIdx >= 0;

  // ── Transition state — all declared before useEffect ───────────────────────

  const [pendingStatus, setPendingStatus] = useState<OpportunityStatus | null>(null);
  const [noteText, setNoteText] = useState("");
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [isTransitioning, startStatusTransition] = useTransition();

  // ── Checklist state ────────────────────────────────────────────────────────

  // Initialize checklistLoading to true only when already validating on mount.
  // Component is remounted (key prop) when status changes, so this is always accurate.
  const [checklist, setChecklist] = useState<ChecklistRow | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(status === "validating");
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [isUpdatingChecklist, startChecklistUpdate] = useTransition();

  // ── Initial fetch (checklist only, when validating) ────────────────────────

  // All setState calls happen inside the .then() callback, not synchronously
  // in the effect body — satisfies react-hooks/set-state-in-effect.
  useEffect(() => {
    if (status !== "validating") return;
    let aborted = false;
    getOpportunityAction(opp.id).then((result) => {
      if (aborted) return;
      setChecklistLoading(false);
      if (result.ok && result.data.checklist) {
        setChecklist(result.data.checklist);
      }
    });
    return () => {
      aborted = true;
    };
    // opp.id and status are stable for the lifetime of this mount (key prop resets)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────

  const pendingTransitionCfg = pendingStatus
    ? transitions.find((t) => t.targetStatus === pendingStatus) ?? null
    : null;

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleTransitionClick(targetStatus: OpportunityStatus) {
    const t = transitions.find((t) => t.targetStatus === targetStatus);
    if (!t) return;
    if (t.requiresNote || t.requiresConfirm) {
      setPendingStatus(targetStatus);
      setNoteText("");
      setTransitionError(null);
    } else {
      doTransition(targetStatus, undefined);
    }
  }

  function doTransition(targetStatus: OpportunityStatus, note: string | undefined) {
    setTransitionError(null);
    startStatusTransition(async () => {
      const result = await updateOpportunityStatusAction(opp.id, {
        targetStatus,
        noteBody: note?.trim() || undefined,
      });
      if (result.ok) {
        setPendingStatus(null);
        setNoteText("");
        router.refresh();
      } else {
        setTransitionError(result.error);
      }
    });
  }

  function handleChecklistChange(
    field: keyof Omit<ChecklistRow, "opportunityId" | "updatedAt">,
    value: number
  ) {
    if (!checklist) return;
    const prev = checklist[field] as number;
    // Optimistic update
    setChecklist((c) => (c ? { ...c, [field]: value } : c));
    setChecklistError(null);
    startChecklistUpdate(async () => {
      const result = await updateChecklistAction(opp.id, { [field]: value });
      if (!result.ok) {
        // Revert on error
        setChecklist((c) => (c ? { ...c, [field]: prev } : c));
        setChecklistError(result.error);
      }
    });
  }

  // ── Checklist completion progress ──────────────────────────────────────────

  function checklistProgress(cl: ChecklistRow): { done: number; total: number } {
    const done = [
      cl.usersIdentified >= 1,
      cl.conversationsCompleted >= 5,
      cl.problemConfirmed >= 3,
      cl.solutionRequested >= 2,
      cl.willingnessToPaySignal >= 1,
      cl.workaroundDocumented >= 1,
    ].filter(Boolean).length;
    return { done, total: 6 };
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-4 border-b border-border">
      {/* ── Lifecycle progress bar ──────────────────────────────────────────── */}
      {isOnMainPath ? (
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
        /* Off-path status: watch / rejected / archived */
        <div
          className={cn(
            "text-xs px-3 py-2 rounded",
            status === "rejected"
              ? "bg-red-500/8 text-red-400"
              : "bg-secondary/50 text-muted-foreground"
          )}
        >
          <span className="font-medium">{STATUS_CONFIG[status].label}</span>
          {" — "}
          {status === "rejected"
            ? "rejected from pipeline"
            : status === "watch"
            ? "parked — monitoring for change"
            : "archived"}
        </div>
      )}

      {/* ── Transition buttons ──────────────────────────────────────────────── */}
      {transitions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {transitions.map((t) => (
              <button
                key={t.targetStatus}
                onClick={() => handleTransitionClick(t.targetStatus)}
                disabled={isTransitioning}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded border transition-all disabled:opacity-60",
                  t.variant === "primary" &&
                    "bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary",
                  t.variant === "secondary" &&
                    "bg-secondary/60 hover:bg-secondary border-border text-muted-foreground hover:text-foreground",
                  t.variant === "danger" &&
                    "bg-red-500/8 hover:bg-red-500/15 border-red-500/20 text-red-400"
                )}
              >
                {isTransitioning && pendingStatus === t.targetStatus ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving…
                  </span>
                ) : (
                  t.label
                )}
              </button>
            ))}
          </div>

          {/* Pending step — note textarea or confirmation */}
          {pendingStatus && (
            <div className="border border-border rounded-md p-3 bg-background/60 space-y-2">
              {pendingTransitionCfg?.requiresNote && (
                <>
                  <p className="text-[11px] text-muted-foreground">
                    {pendingStatus === "rejected"
                      ? "Rejection reason (optional)"
                      : "Watch note — what signal would change your mind? (optional)"}
                  </p>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder={
                      pendingStatus === "rejected"
                        ? "Why is this being rejected?"
                        : "What would bring this back?"
                    }
                    rows={2}
                    disabled={isTransitioning}
                    className="w-full bg-transparent border border-border rounded text-xs text-foreground p-2 resize-none placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 disabled:opacity-50"
                  />
                </>
              )}
              {pendingTransitionCfg?.requiresConfirm &&
                !pendingTransitionCfg.requiresNote && (
                  <p className="text-xs text-muted-foreground">
                    Move to{" "}
                    <span className="text-emerald-400 font-medium">Build</span>?
                    This signals you&apos;re committed to building this
                    opportunity.
                  </p>
                )}
              {transitionError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
                  {transitionError}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => doTransition(pendingStatus, noteText)}
                  disabled={isTransitioning}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded transition-all disabled:opacity-60"
                >
                  {isTransitioning && <Loader2 className="w-3 h-3 animate-spin" />}
                  {isTransitioning ? "Saving…" : "Confirm"}
                </button>
                <button
                  onClick={() => {
                    setPendingStatus(null);
                    setNoteText("");
                    setTransitionError(null);
                  }}
                  disabled={isTransitioning}
                  className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Validation checklist — only when validating ──────────────────────── */}
      {status === "validating" && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Validation Checklist
            </p>
            {checklist && !checklistLoading && (() => {
              const { done, total } = checklistProgress(checklist);
              return (
                <div className="flex items-center gap-2">
                  {isUpdatingChecklist && (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  )}
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {done}/{total}
                  </span>
                  <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(done / total) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>

          {checklistLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading checklist…
            </div>
          ) : checklistError ? (
            <p className="text-xs text-red-400">{checklistError}</p>
          ) : checklist ? (
            <div className="space-y-2.5">
              <ChecklistBool
                done={checklist.usersIdentified >= 1}
                label="10 target users identified"
                disabled={isUpdatingChecklist}
                onClick={() =>
                  handleChecklistChange(
                    "usersIdentified",
                    checklist.usersIdentified >= 1 ? 0 : 1
                  )
                }
              />
              <ChecklistCounter
                value={checklist.conversationsCompleted}
                max={5}
                label="Conversations completed"
                disabled={isUpdatingChecklist}
                onDecrement={() =>
                  handleChecklistChange(
                    "conversationsCompleted",
                    Math.max(0, checklist.conversationsCompleted - 1)
                  )
                }
                onIncrement={() =>
                  handleChecklistChange(
                    "conversationsCompleted",
                    Math.min(5, checklist.conversationsCompleted + 1)
                  )
                }
              />
              <ChecklistCounter
                value={checklist.problemConfirmed}
                max={3}
                label="Users confirmed the problem"
                disabled={isUpdatingChecklist}
                onDecrement={() =>
                  handleChecklistChange(
                    "problemConfirmed",
                    Math.max(0, checklist.problemConfirmed - 1)
                  )
                }
                onIncrement={() =>
                  handleChecklistChange(
                    "problemConfirmed",
                    Math.min(3, checklist.problemConfirmed + 1)
                  )
                }
              />
              <ChecklistCounter
                value={checklist.solutionRequested}
                max={2}
                label="Users asked for the solution"
                disabled={isUpdatingChecklist}
                onDecrement={() =>
                  handleChecklistChange(
                    "solutionRequested",
                    Math.max(0, checklist.solutionRequested - 1)
                  )
                }
                onIncrement={() =>
                  handleChecklistChange(
                    "solutionRequested",
                    Math.min(2, checklist.solutionRequested + 1)
                  )
                }
              />
              <ChecklistBool
                done={checklist.willingnessToPaySignal >= 1}
                label="Willingness-to-pay signal captured"
                sub="Unprompted price mention, competitor spend disclosed, or pilot offer accepted"
                disabled={isUpdatingChecklist}
                onClick={() =>
                  handleChecklistChange(
                    "willingnessToPaySignal",
                    checklist.willingnessToPaySignal >= 1 ? 0 : 1
                  )
                }
              />
              <ChecklistBool
                done={checklist.workaroundDocumented >= 1}
                label="Competing workaround documented"
                sub="What do people use today? Why is it not good enough?"
                disabled={isUpdatingChecklist}
                onClick={() =>
                  handleChecklistChange(
                    "workaroundDocumented",
                    checklist.workaroundDocumented >= 1 ? 0 : 1
                  )
                }
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic">
              Checklist not available.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Checklist sub-components ──────────────────────────────────────────────────

function ChecklistBool({
  done,
  label,
  sub,
  disabled,
  onClick,
}: {
  done: boolean;
  label: string;
  sub?: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-start gap-2.5 text-left hover:bg-secondary/20 rounded px-1 py-0.5 -mx-1 transition-colors disabled:opacity-60"
    >
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
      ) : (
        <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
      )}
      <div>
        <span
          className={cn(
            "text-xs",
            done ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {label}
        </span>
        {sub && (
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</p>
        )}
      </div>
    </button>
  );
}

function ChecklistCounter({
  value,
  max,
  label,
  disabled,
  onDecrement,
  onIncrement,
}: {
  value: number;
  max: number;
  label: string;
  disabled: boolean;
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
      <span
        className={cn(
          "text-xs flex-1",
          done ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={onDecrement}
          disabled={disabled || value <= 0}
          aria-label={`Decrease ${label}`}
          className="w-5 h-5 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 transition-colors"
        >
          <Minus className="w-2.5 h-2.5" />
        </button>
        <span className="font-mono text-xs text-foreground w-8 text-center">
          {value}/{max}
        </span>
        <button
          onClick={onIncrement}
          disabled={disabled || value >= max}
          aria-label={`Increase ${label}`}
          className="w-5 h-5 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 transition-colors"
        >
          <Plus className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}
