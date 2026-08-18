"use client";

import { useState } from "react";
import { AGENTS } from "@/lib/mock-data";
import type { Agent, AgentRun } from "@/lib/types";
import { AgentCard } from "@/components/agents/agent-card";
import { AgentDetail } from "@/components/agents/agent-detail";

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [extraRuns, setExtraRuns] = useState<Record<string, AgentRun[]>>({});

  function handleRunComplete(agentId: string, run: AgentRun) {
    setExtraRuns((prev) => ({
      ...prev,
      [agentId]: [run, ...(prev[agentId] ?? [])],
    }));
  }

  const autonomous = AGENTS.filter((a) => a.type === "autonomous");
  const clickTriggered = AGENTS.filter((a) => a.type === "click-triggered");
  const needsApproval = AGENTS.filter(
    (a) => (a.pendingApprovals?.length ?? 0) > 0
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Agents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {AGENTS.length} agents registered &middot;{" "}
            {AGENTS.filter((a) => a.status !== "error").length} healthy
          </p>
        </div>
        <div className="flex gap-2">
          {needsApproval.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-md">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-xs text-amber-400 font-medium">
                {needsApproval.reduce((s, a) => s + (a.pendingApprovals?.length ?? 0), 0)} pending approval
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Autonomous agents */}
      <div className="space-y-3">
        <h2 className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
          Autonomous — {autonomous.length}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {autonomous.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onSelect={setSelectedAgent}
              onRunComplete={handleRunComplete}
            />
          ))}
        </div>
      </div>

      {/* Click-triggered agents */}
      <div className="space-y-3">
        <h2 className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
          Click-Triggered — {clickTriggered.length}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clickTriggered.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onSelect={setSelectedAgent}
              onRunComplete={handleRunComplete}
            />
          ))}
        </div>
      </div>

      {/* Detail drawer */}
      {selectedAgent && (
        <AgentDetail
          agent={selectedAgent}
          extraRuns={extraRuns[selectedAgent.id] ?? []}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}
