"use client";

import { useState, useMemo } from "react";
import {
  Target,
  Play,
  Settings2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  FlaskConical,
  Bot,
  ChevronRight,
} from "lucide-react";
import { DataStateBadge } from "@/components/ui/data-state-badge";
import { OppDetail, STATUS_CONFIG } from "@/components/opportunities/opp-detail";
import { OPPORTUNITIES, RADAR_STATS } from "@/lib/opportunity-data";
import { cn } from "@/lib/utils";
import type { OpportunityRecord, OpportunityStatus, ValidationChecklist } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Filter / sort types ───────────────────────────────────────────────────────

type StatusFilter = OpportunityStatus | "all";
type ScoreFilter = "all" | "6+" | "7+" | "8+";
type SortKey =
  | "overall"
  | "painSeverity"
  | "willingnessToPay"
  | "founderFit"
  | "discoveredAt"
  | "signals";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "validate-now", label: "Validate Now" },
  { value: "validating", label: "Validating" },
  { value: "investigating", label: "Investigating" },
  { value: "watch", label: "Watch" },
  { value: "rejected", label: "Rejected" },
  { value: "new", label: "New" },
];

// ── Small inline score chip ───────────────────────────────────────────────────

function ScoreChip({ label, score }: { label: string; score: number }) {
  const color =
    score >= 7
      ? "text-emerald-400 bg-emerald-500/10"
      : score >= 5
      ? "text-amber-400 bg-amber-500/10"
      : "text-red-400 bg-red-500/10";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono",
        color
      )}
      title={label}
    >
      <span className="text-[9px] text-current/60">{label.slice(0, 3)}</span>
      {score}
    </span>
  );
}

// ── Sort indicator ────────────────────────────────────────────────────────────

function SortIcon({
  column,
  current,
  dir,
}: {
  column: SortKey;
  current: SortKey;
  dir: "asc" | "desc";
}) {
  if (column !== current)
    return <ChevronsUpDown className="w-3 h-3 text-muted-foreground/30" />;
  return dir === "desc" ? (
    <ChevronDown className="w-3 h-3 text-primary" />
  ) : (
    <ChevronUp className="w-3 h-3 text-primary" />
  );
}

// ── Radar stats strip ─────────────────────────────────────────────────────────
// highConfidence, validatingCount, total are derived from live state

function RadarStatsStrip({
  highConfidence,
  validatingCount,
  total,
}: {
  highConfidence: number;
  validatingCount: number;
  total: number;
}) {
  const stats = [
    { label: "Last scan", value: timeAgo(RADAR_STATS.lastScan), mono: true },
    { label: "Sources scanned", value: RADAR_STATS.sourcesScanned, mono: true },
    { label: "Discovered", value: total, mono: true },
    { label: "High confidence (≥7)", value: highConfidence, mono: true, highlight: true },
    { label: "Currently validating", value: validatingCount, mono: true, highlight: true },
    { label: "Next scan", value: formatDate(RADAR_STATS.nextScan), mono: true },
  ];

  return (
    <div className="grid grid-cols-3 xl:grid-cols-6 gap-3">
      {stats.map(({ label, value, mono, highlight }) => (
        <div
          key={label}
          className="bg-card border border-border rounded-lg px-4 py-3 space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">
              {label}
            </p>
            <DataStateBadge state="demo" showLabel={false} />
          </div>
          <p
            className={cn(
              "text-xl font-semibold",
              mono && "font-mono tabular-nums",
              highlight ? "text-primary" : "text-foreground"
            )}
          >
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  // ── Mutable opportunity state ────────────────────────────────────────────
  // Initialized from static mock data. All lifecycle changes live here for this
  // session. Replace setOpps calls with API mutations when persistence is added.
  const [opps, setOpps] = useState<OpportunityRecord[]>(() => [...OPPORTUNITIES]);

  // Track selected by ID so derived selectedOpp re-derives on every opps update
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedOpp = selectedId ? opps.find((o) => o.id === selectedId) ?? null : null;

  // Optional notes per opportunity (rejection reason, watch note) — session only
  const [oppNotes, setOppNotes] = useState<
    Record<string, { rejectionReason?: string; watchNote?: string }>
  >({});

  // ── Filter / sort state ──────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("overall");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ── Simulated scan ───────────────────────────────────────────────────────
  const [simulating, setSimulating] = useState(false);
  const [simDone, setSimDone] = useState(false);

  // ── Lifecycle handlers ───────────────────────────────────────────────────

  function handleStatusChange(
    newStatus: OpportunityStatus,
    opts?: { rejectionReason?: string; watchNote?: string }
  ) {
    if (!selectedId) return;
    const id = selectedId;
    setOpps((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const updated: OpportunityRecord = { ...o, status: newStatus };
        // Auto-provision a blank checklist the first time an opp enters Validating
        if (newStatus === "validating" && !o.validationChecklist) {
          updated.validationChecklist = {
            usersIdentified: false,
            conversationsCompleted: 0,
            problemConfirmed: 0,
            solutionRequested: 0,
            willingnessToPaySignal: false,
            workaroundDocumented: false,
          };
        }
        return updated;
      })
    );
    if (opts && (opts.rejectionReason || opts.watchNote)) {
      setOppNotes((prev) => ({ ...prev, [id]: { ...prev[id], ...opts } }));
    }
  }

  function handleChecklistChange(
    field: keyof ValidationChecklist,
    value: boolean | number
  ) {
    if (!selectedId) return;
    const id = selectedId;
    setOpps((prev) =>
      prev.map((o) => {
        if (o.id !== id || !o.validationChecklist) return o;
        return {
          ...o,
          validationChecklist: { ...o.validationChecklist, [field]: value },
        };
      })
    );
  }

  // ── Sort helper ──────────────────────────────────────────────────────────

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  // ── Derived stats (reactive to opps state) ───────────────────────────────

  const highConfidence = useMemo(
    () => opps.filter((o) => o.scorecard.overall >= 7).length,
    [opps]
  );
  const validatingCount = useMemo(
    () => opps.filter((o) => o.status === "validating").length,
    [opps]
  );

  // ── Filtered + sorted list ───────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...opps];

    if (statusFilter !== "all") {
      list = list.filter((o) => o.status === statusFilter);
    }

    if (scoreFilter !== "all") {
      const threshold = parseFloat(scoreFilter);
      list = list.filter((o) => o.scorecard.overall >= threshold);
    }

    list.sort((a, b) => {
      let av = 0;
      let bv = 0;
      if (sortKey === "overall") {
        av = a.scorecard.overall;
        bv = b.scorecard.overall;
      } else if (sortKey === "discoveredAt") {
        av = new Date(a.discoveredAt).getTime();
        bv = new Date(b.discoveredAt).getTime();
      } else if (sortKey === "signals") {
        av = a.signals.length;
        bv = b.signals.length;
      } else {
        av = a.scorecard[sortKey].score;
        bv = b.scorecard[sortKey].score;
      }
      return sortDir === "desc" ? bv - av : av - bv;
    });

    return list;
  }, [opps, statusFilter, scoreFilter, sortKey, sortDir]);

  function handleRunRadar() {
    if (simulating || simDone) return;
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      setSimDone(true);
      setTimeout(() => setSimDone(false), 3000);
    }, 2400);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Bot className="w-3 h-3" />
            <span>Jarvis</span>
            <ChevronRight className="w-2.5 h-2.5" />
            <Target className="w-3 h-3" />
            <span>Opportunity Radar</span>
            <ChevronRight className="w-2.5 h-2.5" />
            <span>Workspace</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Opportunity Radar
          </h1>
          <p className="text-sm text-muted-foreground">
            Research intelligence pipeline — discover, evaluate, and validate
            genuine business opportunities.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            disabled
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-md hover:text-foreground hover:bg-secondary/50 transition-all disabled:opacity-40"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Configure Radar
          </button>
          <button
            onClick={handleRunRadar}
            disabled={simulating}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-all",
              simDone
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                : "bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary disabled:opacity-60"
            )}
          >
            <Play className={cn("w-3.5 h-3.5", simulating && "animate-pulse")} />
            {simulating ? "Scanning…" : simDone ? "Scan complete" : "Run Opportunity Radar"}
          </button>
        </div>
      </div>

      {/* Demo banner */}
      <div className="flex items-center gap-2 text-xs text-amber-500/80 bg-amber-500/6 border border-amber-500/15 rounded-md px-4 py-2.5">
        <FlaskConical className="w-3.5 h-3.5 flex-shrink-0" />
        All opportunities below are{" "}
        <strong className="text-amber-400">demo data</strong> — illustrative
        examples only. Scores, signals, and source citations are fictional.
        Lifecycle changes are session-only and reset on page reload.
      </div>

      {/* Stats strip — derived from live opps state */}
      <RadarStatsStrip
        highConfidence={highConfidence}
        validatingCount={validatingCount}
        total={opps.length}
      />

      {/* Opportunity table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Table header + filters */}
        <div className="px-5 py-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium text-foreground">
              Opportunities
              <span className="ml-2 font-mono text-xs text-muted-foreground">
                ({filtered.length})
              </span>
            </h2>
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value as ScoreFilter)}
              className="bg-input border border-border rounded px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
            >
              <option value="all">All scores</option>
              <option value="6+">Score ≥ 6</option>
              <option value="7+">Score ≥ 7</option>
              <option value="8+">Score ≥ 8</option>
            </select>
          </div>

          {/* Status filter pills — counts derived from live opps state */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map(({ value, label }) => {
              const count =
                value === "all"
                  ? opps.length
                  : opps.filter((o) => o.status === value).length;
              if (count === 0 && value !== "all") return null;
              return (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-md border transition-all",
                    statusFilter === value
                      ? "bg-primary/15 border-primary/30 text-primary font-medium"
                      : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  {label}
                  <span className="font-mono text-[10px] opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[24px_1fr_140px_120px_90px_90px_80px] gap-3 px-5 py-2 border-b border-border bg-background/40">
          <div />
          <button
            className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-widest text-left hover:text-foreground transition-colors"
            onClick={() => handleSort("overall")}
          >
            Opportunity
            <SortIcon column="overall" current={sortKey} dir={sortDir} />
          </button>
          <button
            className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-widest text-left hover:text-foreground transition-colors"
            onClick={() => handleSort("founderFit")}
          >
            Key scores
            <SortIcon column="founderFit" current={sortKey} dir={sortDir} />
          </button>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Customer
          </div>
          <button
            className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-widest text-left hover:text-foreground transition-colors"
            onClick={() => handleSort("signals")}
          >
            Signals
            <SortIcon column="signals" current={sortKey} dir={sortDir} />
          </button>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Status
          </div>
          <button
            className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-widest text-left hover:text-foreground transition-colors"
            onClick={() => handleSort("discoveredAt")}
          >
            Found
            <SortIcon column="discoveredAt" current={sortKey} dir={sortDir} />
          </button>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No opportunities match the current filters.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((opp) => {
              const statusCfg = STATUS_CONFIG[opp.status];
              const scoreColor =
                opp.scorecard.overall >= 7
                  ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/8"
                  : opp.scorecard.overall >= 5
                  ? "text-amber-400 border-amber-500/30 bg-amber-500/8"
                  : "text-red-400 border-red-500/30 bg-red-500/8";
              const isSelected = opp.id === selectedId;

              return (
                <div
                  key={opp.id}
                  onClick={() => setSelectedId(opp.id)}
                  className={cn(
                    "grid grid-cols-[24px_1fr_140px_120px_90px_90px_80px] gap-3 px-5 py-3.5 cursor-pointer hover:bg-secondary/20 transition-colors items-center",
                    isSelected && "bg-secondary/30"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0",
                      scoreColor
                    )}
                  >
                    <span className="font-mono text-[10px] font-bold">
                      {Math.round(opp.scorecard.overall)}
                    </span>
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {opp.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 leading-snug">
                      {opp.problemStatement}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    <ScoreChip label="Pain" score={opp.scorecard.painSeverity.score} />
                    <ScoreChip label="WTP" score={opp.scorecard.willingnessToPay.score} />
                    <ScoreChip label="Fit" score={opp.scorecard.founderFit.score} />
                  </div>

                  <p className="text-[11px] text-muted-foreground truncate">
                    {opp.customerType}
                  </p>

                  <p className="font-mono text-xs text-muted-foreground text-center">
                    {opp.signals.length}
                  </p>

                  <span
                    className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded w-fit",
                      statusCfg.bg,
                      statusCfg.color
                    )}
                  >
                    {statusCfg.label}
                  </span>

                  <p className="font-mono text-[10px] text-muted-foreground/60">
                    {formatDate(opp.discoveredAt)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail panel — re-derives from opps state so updates propagate immediately */}
      {selectedOpp && (
        <OppDetail
          opp={selectedOpp}
          note={oppNotes[selectedOpp.id]}
          onStatusChange={handleStatusChange}
          onChecklistChange={handleChecklistChange}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
