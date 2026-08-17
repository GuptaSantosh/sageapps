"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowRight, CornerDownLeft, Bot, ChevronRight, FlaskConical, ExternalLink } from "lucide-react";
import Link from "next/link";
import { JarvisOrb, type OrbState } from "./orb";
import { resolveCommand, type CommandResult, type DelegationStep } from "@/lib/jarvis-commands";
import { cn } from "@/lib/utils";

// ── Example commands shown as quick-chips ─────────────────────────────────────

const EXAMPLE_COMMANDS = [
  "Run Opportunity Radar",
  "What needs my approval?",
  "What should I focus on this week?",
  "Summarize today",
  "Run MailSage",
  "Opportunities above 8",
];

// ── Agent colour mapping for delegation trace ──────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  'opportunity-radar': 'text-violet-400',
  'fin-sage':          'text-emerald-400',
  'tax-sage-analyst':  'text-blue-400',
  'mail-sage':         'text-sky-400',
  'content-agent':     'text-amber-400',
  'session':           'text-muted-foreground',
  'approval-queue':    'text-orange-400',
};

// ── Delegation trace component ────────────────────────────────────────────────

function DelegationTrace({
  result,
  visibleSteps,
  showResult,
}: {
  result: CommandResult;
  visibleSteps: number;
  showResult: boolean;
}) {
  const agentColor = AGENT_COLORS[result.agentId] ?? 'text-primary';

  return (
    <div className="pt-4 space-y-4">
      {/* Activity chain */}
      <div className="space-y-1.5">
        {/* Root: Jarvis */}
        <div className="flex items-center gap-2">
          <Bot className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="text-xs font-medium text-primary tracking-wide">Jarvis</span>
        </div>

        {/* Delegation steps — appear progressively */}
        {result.steps.map((step, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-2 pl-3.5",
              i < visibleSteps ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            style={{
              animation: i < visibleSteps ? 'step-appear 0.3s ease forwards' : 'none',
            }}
          >
            <ChevronRight
              className={cn(
                "w-3 h-3 flex-shrink-0 mt-0.5",
                i === result.steps.length - 1 && i < visibleSteps
                  ? "text-primary"
                  : "text-muted-foreground/50"
              )}
            />
            <span
              className={cn(
                "text-xs leading-tight",
                i === result.steps.length - 1 && i < visibleSteps
                  ? agentColor
                  : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Result output */}
      {showResult && (
        <div
          className="border-t border-border pt-4 space-y-2"
          style={{ animation: 'result-appear 0.4s ease forwards' }}
        >
          {/* Agent name + simulated badge */}
          <div className="flex items-center justify-between">
            <p className={cn("text-[11px] font-semibold uppercase tracking-widest", agentColor)}>
              {result.agentName}
            </p>
            <span className="flex items-center gap-1 text-[10px] text-amber-500/70 bg-amber-500/8 px-2 py-0.5 rounded">
              <FlaskConical className="w-3 h-3" />
              Simulated
            </span>
          </div>

          {/* Output text */}
          <div className="bg-background border border-border rounded-md px-4 py-3.5">
            <pre className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed font-mono">
              {result.response}
            </pre>
          </div>

          {/* Workspace link (when the result has a deeper workspace) */}
          {result.workspaceLink && (
            <Link
              href={result.workspaceLink}
              className="inline-flex items-center gap-1.5 text-[11px] text-primary/80 hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Open workspace
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main command panel ────────────────────────────────────────────────────────

export function CommandPanel() {
  const [query, setQuery] = useState("");
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [result, setResult] = useState<CommandResult | null>(null);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Clear all pending timers
  const clearTimers = useCallback(() => {
    stepTimers.current.forEach(clearTimeout);
    stepTimers.current = [];
  }, []);

  const runCommand = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    clearTimers();
    setQuery("");
    setOrbState("thinking");
    setResult(null);
    setVisibleSteps(0);
    setShowResult(false);

    const cmd = resolveCommand(trimmed);
    setResult(cmd);

    // Progressive step reveal
    cmd.steps.forEach((step: DelegationStep, i: number) => {
      const t = setTimeout(() => {
        setVisibleSteps(i + 1);
      }, step.delayMs);
      stepTimers.current.push(t);
    });

    // Show result after last step
    const lastDelay = cmd.steps[cmd.steps.length - 1]?.delayMs ?? 1000;
    const resultTimer = setTimeout(() => {
      setShowResult(true);
      setOrbState("done");
      // Return to idle after a moment
      const idleTimer = setTimeout(() => setOrbState("idle"), 1800);
      stepTimers.current.push(idleTimer);
    }, lastDelay + 300);
    stepTimers.current.push(resultTimer);
  }, [clearTimers]);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) runCommand(query);
  };

  const isProcessing = orbState === "thinking";

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">

      {/* ── Header row: orb + identity ────────────────────────────────────── */}
      <div className="flex items-center gap-5 px-6 py-5 border-b border-border">
        <JarvisOrb state={orbState} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <p className="text-sm font-semibold tracking-[0.12em] uppercase text-foreground">
              Jarvis
            </p>
            <span className="text-muted-foreground/30 text-xs">·</span>
            <span className="text-xs text-muted-foreground">Orchestration layer</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-500",
                isProcessing ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-emerald-500/40"
              )}
            />
            <span className={cn(
              "font-mono text-[11px] transition-colors duration-300",
              isProcessing ? "text-emerald-400" : "text-muted-foreground/60"
            )}>
              {isProcessing ? "processing" : orbState === "done" ? "complete" : "idle"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Command input + chips ─────────────────────────────────────────── */}
      <div className="px-6 py-5 space-y-4">

        {/* Input */}
        <div className="flex items-center gap-2 border border-border rounded-md bg-background focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-150">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            disabled={isProcessing}
            placeholder={isProcessing ? "Processing…" : "Ask Jarvis…"}
            className="flex-1 bg-transparent px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={() => runCommand(query)}
            disabled={!query.trim() || isProcessing}
            className="flex items-center gap-1.5 mr-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            title="Run (Enter)"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Example command chips */}
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              onClick={() => runCommand(cmd)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary border border-border rounded-md transition-all duration-100 disabled:opacity-40"
            >
              <ArrowRight className="w-2.5 h-2.5 flex-shrink-0" />
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* ── Delegation trace + result (expands when command runs) ──────────── */}
      {result && (
        <div className="px-6 pb-5 border-t border-border pt-1">
          <DelegationTrace
            result={result}
            visibleSteps={visibleSteps}
            showResult={showResult}
          />
        </div>
      )}
    </div>
  );
}
