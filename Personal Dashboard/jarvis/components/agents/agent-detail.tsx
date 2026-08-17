"use client";

import { useState } from "react";
import {
  X,
  Play,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  Code2,
  Check,
  Ban,
  Link2,
  Plug,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataStateBadge } from "@/components/ui/data-state-badge";
import { cn } from "@/lib/utils";
import type { Agent, AgentRun, ApprovalItem, AgentInputParam } from "@/lib/types";
import { runAgent } from "@/lib/agents";

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual",
  scheduled: "Scheduled",
  "event-triggered": "Event-triggered",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function RunEntry({ run }: { run: AgentRun }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors"
      >
        {run.status === "success" ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        ) : run.status === "error" ? (
          <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
        ) : (
          <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />
        )}
        <span className="font-mono text-xs text-muted-foreground flex-shrink-0">
          {timeAgo(run.startedAt)}
        </span>
        {run.completedAt && (
          <span className="font-mono text-[10px] text-muted-foreground/60">
            {Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s
          </span>
        )}
        {run.params && (
          <div className="flex gap-1 flex-wrap flex-1">
            {Object.entries(run.params).map(([k, v]) => (
              <span key={k} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                {v}
              </span>
            ))}
          </div>
        )}
        <span className="ml-auto flex-shrink-0">
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-border bg-background">
          <div className="px-3 py-3">
            <pre className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed font-mono">
              {run.output}
            </pre>
          </div>
          {run.sources && run.sources.length > 0 && (
            <div className="px-3 pb-3 border-t border-border pt-2 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Sources
              </p>
              {run.sources.map((src, i) => (
                <div key={i} className="flex items-baseline gap-2">
                  <span className="text-[10px] text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded flex-shrink-0">
                    {src.platform}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{src.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ParamInput({
  param,
  value,
  onChange,
}: {
  param: AgentInputParam;
  value: string;
  onChange: (v: string) => void;
}) {
  const base = "w-full bg-input border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";
  if (param.type === "select") {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(base, "cursor-pointer")}>
        {param.options?.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      type={param.type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={param.placeholder}
      className={base}
    />
  );
}

function ApprovalCard({
  item,
  onApprove,
  onReject,
}: {
  item: ApprovalItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [decided, setDecided] = useState<"approved" | "rejected" | null>(null);
  return (
    <div className="border border-border rounded-md p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{item.description}</p>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            <span className="text-amber-400">Action: </span>{item.action}
          </p>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground flex-shrink-0">
          {timeAgo(item.createdAt)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground/80 bg-secondary/50 rounded px-3 py-2 leading-relaxed">
        {item.details}
      </p>
      {decided ? (
        <p className={cn("text-xs font-medium", decided === "approved" ? "text-emerald-400" : "text-red-400")}>
          {decided === "approved" ? "Approved" : "Rejected"}
        </p>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => { setDecided("approved"); onApprove(item.id); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded text-xs font-medium transition-all"
          >
            <Check className="w-3 h-3" /> Approve
          </button>
          <button
            onClick={() => { setDecided("rejected"); onReject(item.id); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded text-xs font-medium transition-all"
          >
            <Ban className="w-3 h-3" /> Reject
          </button>
        </div>
      )}
    </div>
  );
}

interface AgentDetailProps {
  agent: Agent;
  extraRuns: AgentRun[];
  onClose: () => void;
}

export function AgentDetail({ agent, extraRuns, onClose }: AgentDetailProps) {
  const [params, setParams] = useState<Record<string, string>>(
    Object.fromEntries(agent.inputParams.map((p) => [p.key, p.defaultValue ?? ""]))
  );
  const [isRunning, setIsRunning] = useState(false);
  const [liveOutput, setLiveOutput] = useState<string | null>(null);
  const [approvals, setApprovals] = useState(agent.pendingApprovals ?? []);

  const allRuns = [...extraRuns, ...agent.runHistory];

  async function handleRun() {
    setIsRunning(true);
    setLiveOutput(null);
    const result = await runAgent(agent.id, params);
    setIsRunning(false);
    setLiveOutput(result.output);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />

      <div className="w-[600px] h-full bg-card border-l border-border flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-start gap-4">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-foreground">{agent.name}</h2>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] uppercase tracking-wide border-0 px-2",
                  agent.triggerType === "scheduled"
                    ? "bg-violet-500/10 text-violet-400"
                    : agent.triggerType === "event-triggered"
                    ? "bg-orange-500/10 text-orange-400"
                    : "bg-blue-500/10 text-blue-400"
                )}
              >
                {TRIGGER_LABELS[agent.triggerType]}
              </Badge>
              <DataStateBadge state={agent.dataState} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{agent.description}</p>
            {agent.connectors && agent.connectors.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Plug className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
                {agent.connectors.map((c) => (
                  <span key={c} className="text-[10px] text-muted-foreground/60 bg-secondary/60 px-1.5 py-0.5 rounded">
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="run" className="flex-1 flex flex-col min-h-0">
          <TabsList className="px-6 py-0 h-10 bg-transparent border-b border-border rounded-none gap-0 justify-start">
            {[
              ["run", agent.type === "click-triggered" ? "Run" : "Status"],
              ["history", `History (${allRuns.length})`],
              ["prompt", "Prompt"],
              ...(approvals.length > 0 ? [["approvals", `Approvals (${approvals.length})`]] : []),
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

          {/* Run / Status tab */}
          <TabsContent value="run" className="flex-1 flex flex-col min-h-0 mt-0">
            <ScrollArea className="flex-1">
              <div className="px-6 py-5 space-y-5">
                {agent.type === "click-triggered" && (
                  <>
                    {agent.inputParams.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">Parameters</p>
                        {agent.inputParams.map((param) => (
                          <div key={param.key} className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">{param.label}</label>
                            <ParamInput
                              param={param}
                              value={params[param.key] ?? ""}
                              onChange={(v) => setParams((p) => ({ ...p, [param.key]: v }))}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={handleRun}
                      disabled={isRunning}
                      className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm font-medium transition-all disabled:opacity-60"
                    >
                      {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      {isRunning ? "Running…" : "Run Agent"}
                    </button>
                    {isRunning && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing…
                      </div>
                    )}
                    {liveOutput && !isRunning && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completed
                        </div>
                        <div className="bg-background border border-border rounded-md p-4">
                          <pre className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed font-mono">
                            {liveOutput}
                          </pre>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {agent.type === "autonomous" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-background border border-border rounded-md px-4 py-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Schedule</p>
                        <p className="text-xs text-foreground font-mono">{agent.schedule ?? "—"}</p>
                      </div>
                      <div className="bg-background border border-border rounded-md px-4 py-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Last Run</p>
                        <p className="text-xs text-foreground font-mono">{timeAgo(agent.lastRunAt)}</p>
                      </div>
                      <div className="bg-background border border-border rounded-md px-4 py-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Data state</p>
                        <DataStateBadge state={agent.dataState} />
                      </div>
                      <div className="bg-background border border-border rounded-md px-4 py-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Model</p>
                        <p className="text-xs text-foreground font-mono">{agent.model ?? "not wired"}</p>
                      </div>
                    </div>
                    {agent.inputParams.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">Parameters (used on scheduled runs)</p>
                        {agent.inputParams.map((param) => (
                          <div key={param.key} className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">{param.label}</label>
                            <ParamInput
                              param={param}
                              value={params[param.key] ?? ""}
                              onChange={(v) => setParams((p) => ({ ...p, [param.key]: v }))}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={handleRun}
                      disabled={isRunning}
                      className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm font-medium transition-all disabled:opacity-60"
                    >
                      {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      {isRunning ? "Running…" : "Run Now"}
                    </button>
                    {liveOutput && !isRunning && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completed
                        </div>
                        <div className="bg-background border border-border rounded-md p-4">
                          <pre className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed font-mono">
                            {liveOutput}
                          </pre>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/40 rounded-md px-4 py-3">
                      <Clock className="w-3.5 h-3.5" />
                      Toggle on the card to enable/disable scheduled runs.
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* History tab */}
          <TabsContent value="history" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              <div className="px-6 py-5 space-y-2">
                {allRuns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No runs yet.</p>
                ) : (
                  allRuns.map((run) => <RunEntry key={run.id} run={run} />)
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Prompt tab */}
          <TabsContent value="prompt" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              <div className="px-6 py-5 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Code2 className="w-3.5 h-3.5" />
                  System Prompt
                </div>
                <div className="bg-background border border-border rounded-md p-4">
                  <pre className="text-xs text-foreground/70 whitespace-pre-wrap leading-relaxed font-mono">
                    {agent.systemPrompt}
                  </pre>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Approvals tab */}
          {approvals.length > 0 && (
            <TabsContent value="approvals" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full">
                <div className="px-6 py-5 space-y-3">
                  {approvals.map((item) => (
                    <ApprovalCard
                      key={item.id}
                      item={item}
                      onApprove={(id) => setApprovals((a) => a.filter((x) => x.id !== id))}
                      onReject={(id) => setApprovals((a) => a.filter((x) => x.id !== id))}
                    />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
