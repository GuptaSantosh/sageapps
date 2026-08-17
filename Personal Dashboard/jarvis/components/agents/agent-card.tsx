"use client";

import { useState } from "react";
import { Play, Loader2, Clock, Calendar, AlertTriangle, CheckCircle2, XCircle, Circle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DataStateBadge } from "@/components/ui/data-state-badge";
import { cn } from "@/lib/utils";
import type { Agent, AgentRun } from "@/lib/types";
import { runAgent } from "@/lib/agents";

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual",
  scheduled: "Scheduled",
  "event-triggered": "Event",
};

const TRIGGER_STYLES: Record<string, string> = {
  manual: "bg-blue-500/10 text-blue-400",
  scheduled: "bg-violet-500/10 text-violet-400",
  "event-triggered": "bg-orange-500/10 text-orange-400",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_CONFIG = {
  idle: { label: "Idle", color: "text-muted-foreground", dot: "bg-muted-foreground/40" },
  running: { label: "Running", color: "text-blue-400", dot: "bg-blue-400 animate-pulse" },
  "needs-approval": { label: "Needs Approval", color: "text-amber-400", dot: "bg-amber-400" },
  error: { label: "Error", color: "text-red-400", dot: "bg-red-400" },
};

interface AgentCardProps {
  agent: Agent;
  onSelect: (agent: Agent) => void;
  onRunComplete?: (agentId: string, run: AgentRun) => void;
}

export function AgentCard({ agent, onSelect, onRunComplete }: AgentCardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [enabled, setEnabled] = useState(agent.enabled ?? true);
  const [currentStatus, setCurrentStatus] = useState(agent.status);

  const status = isRunning ? "running" : currentStatus;
  const { label, color, dot } = STATUS_CONFIG[status];

  async function handleRun(e: React.MouseEvent) {
    e.stopPropagation();
    if (isRunning) return;
    setIsRunning(true);
    const result = await runAgent(agent.id, {});
    setIsRunning(false);
    setCurrentStatus(result.success ? "idle" : "error");
    const newRun: AgentRun = {
      id: result.runId,
      startedAt: new Date().toISOString(),
      completedAt: result.completedAt,
      status: result.success ? "success" : "error",
      output: result.output,
      sources: result.sources,
    };
    onRunComplete?.(agent.id, newRun);
  }

  return (
    <div
      onClick={() => onSelect(agent)}
      className="bg-card border border-border rounded-lg p-5 cursor-pointer hover:border-primary/30 transition-all duration-150 group space-y-4"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {agent.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {agent.description}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] uppercase tracking-wide border-0 px-2",
              TRIGGER_STYLES[agent.triggerType]
            )}
          >
            {TRIGGER_LABELS[agent.triggerType]}
          </Badge>
          <DataStateBadge state={agent.dataState} />
        </div>
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-1.5 h-1.5 rounded-full", dot)} />
          <span className={cn("text-xs font-medium", color)}>{label}</span>
        </div>

        {agent.type === "click-triggered" ? (
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded text-xs font-medium transition-all disabled:opacity-50"
          >
            {isRunning ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {isRunning ? "Running…" : "Run"}
          </button>
        ) : (
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            onClick={(e) => e.stopPropagation()}
            className="scale-75 data-[state=checked]:bg-primary"
          />
        )}
      </div>

      {/* Workspace link */}
      {agent.workspaceUrl && (
        <Link
          href={agent.workspaceUrl}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors w-fit"
        >
          <ExternalLink className="w-3 h-3" />
          Open workspace
        </Link>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-mono">
        {agent.type === "autonomous" && agent.schedule ? (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {agent.schedule}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last run {timeAgo(agent.lastRunAt)}
          </span>
        )}
        {agent.pendingApprovals && agent.pendingApprovals.length > 0 && (
          <span className="flex items-center gap-1 text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            {agent.pendingApprovals.length} pending
          </span>
        )}
        {agent.runHistory.some((r) => r.status === "success") && (
          <span className="flex items-center gap-1 text-emerald-400 ml-auto">
            <CheckCircle2 className="w-3 h-3" />
            {agent.runHistory.filter((r) => r.status === "success").length} runs
          </span>
        )}
      </div>
    </div>
  );
}
