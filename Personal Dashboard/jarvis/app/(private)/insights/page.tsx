"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CHART_DATA, WINS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { WinEntry } from "@/lib/types";
import { Trophy, TrendingUp, Clock, Zap, FlaskConical } from "lucide-react";
import { DataStateBadge } from "@/components/ui/data-state-badge";

const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "6px",
  fontSize: "11px",
  color: "#fafafa",
};

const IMPACT_CONFIG = {
  high: { label: "High Impact", className: "text-emerald-400 bg-emerald-500/10" },
  medium: { label: "Medium", className: "text-blue-400 bg-blue-500/10" },
  low: { label: "Low", className: "text-zinc-400 bg-zinc-500/10" },
};

function WinCard({ win }: { win: WinEntry }) {
  const { label, className } = IMPACT_CONFIG[win.impact];
  const date = new Date(win.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  return (
    <div className="flex items-start gap-4 py-4 border-b border-border last:border-0">
      <div className="flex-shrink-0 mt-0.5">
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", className)}>
          {label}
        </span>
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-foreground">{win.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{win.description}</p>
      </div>
      <span className="font-mono text-[11px] text-muted-foreground flex-shrink-0 mt-0.5">{date}</span>
    </div>
  );
}

const totalRuns = CHART_DATA.reduce((s, d) => s + d.agentRuns, 0);
const totalTimeSaved = CHART_DATA.reduce((s, d) => s + d.timeSavedMinutes, 0);
const avgRunsPerDay = (totalRuns / CHART_DATA.length).toFixed(1);

export default function InsightsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Automation trends and milestone log
        </p>
      </div>

      {/* Demo data banner */}
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/5 border border-amber-500/15 rounded-lg">
        <FlaskConical className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <p className="text-xs text-amber-400/80 leading-relaxed">
          <span className="font-semibold text-amber-400">Demo data</span> — the charts below are illustrative.
          Agent run counts and time-saved estimates are not from real telemetry.
          Connect real agent logging to replace these numbers.
        </p>
      </div>

      {/* Summary stats — all marked demo */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Agent Runs (7d)", value: totalRuns, icon: Zap, color: "text-primary" },
          { label: "Time Saved (7d)", value: `${Math.round(totalTimeSaved / 60)}h ${totalTimeSaved % 60}m`, icon: Clock, color: "text-blue-400" },
          { label: "Avg Runs / Day", value: avgRunsPerDay, icon: TrendingUp, color: "text-violet-400" },
          { label: "Wins Logged", value: WINS.length, icon: Trophy, color: "text-amber-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={cn("w-4 h-4", color)} />
                <span className="text-xs text-muted-foreground uppercase tracking-widest">{label}</span>
              </div>
              {label !== "Wins Logged" && <DataStateBadge state="demo" showLabel={false} />}
            </div>
            <p className="font-mono text-2xl font-semibold text-foreground tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Agent usage */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-medium text-foreground">Agent Runs vs Manual Tasks</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Automation replacing manual work over time</p>
            </div>
            <DataStateBadge state="demo" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={CHART_DATA} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="agentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="manualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: "11px", color: "#71717a" }} />
              <Area type="monotone" dataKey="agentRuns" name="Agent Runs" stroke="#10b981" fill="url(#agentGrad)" strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="manualTasks" name="Manual Tasks" stroke="#3b82f6" fill="url(#manualGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Time saved */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-medium text-foreground">Time Saved per Day</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Estimated minutes recovered from automation</p>
            </div>
            <DataStateBadge state="demo" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CHART_DATA} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => [`${v} min`, "Time Saved"]}
              />
              <Bar dataKey="timeSavedMinutes" name="Minutes Saved" fill="#10b981" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Wins log — manually maintained, not demo */}
      <div className="bg-card border border-border rounded-lg">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-medium text-foreground">Wins Log</h2>
          <span className="text-[10px] text-muted-foreground ml-1">(manually maintained)</span>
          <span className="font-mono text-xs text-muted-foreground ml-auto">{WINS.length} entries</span>
        </div>
        <div className="px-5 py-1">
          {WINS.map((win) => <WinCard key={win.id} win={win} />)}
        </div>
      </div>
    </div>
  );
}
