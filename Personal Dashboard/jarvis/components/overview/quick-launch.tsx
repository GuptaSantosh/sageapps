"use client";

import { useState } from "react";
import { Play, Loader2, CheckCircle2 } from "lucide-react";
import { runAgent } from "@/lib/agents";

const QUICK_AGENTS = [
  { id: "mail-sage", label: "MailSage Brief" },
  { id: "fin-sage", label: "FinSage AIS" },
  { id: "opportunity-radar", label: "Opp. Radar" },
  { id: "content-agent", label: "Content Draft" },
];

export function QuickLaunch() {
  const [running, setRunning] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleRun(agentId: string) {
    setRunning(agentId);
    setDone(null);
    await runAgent(agentId, {});
    setRunning(null);
    setDone(agentId);
    setTimeout(() => setDone(null), 3000);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_AGENTS.map(({ id, label }) => {
        const isRunning = running === id;
        const isDone = done === id;
        return (
          <button
            key={id}
            onClick={() => handleRun(id)}
            disabled={isRunning || !!running}
            className="flex items-center gap-2 px-3.5 py-2 bg-secondary hover:bg-secondary/80 border border-border rounded-md text-sm text-foreground disabled:opacity-50 transition-all duration-100"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : isDone ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Play className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}
