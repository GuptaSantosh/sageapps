"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Target,
  Plus,
  Settings2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronRight,
  Bot,
  X,
  Pencil,
} from "lucide-react";
import { STATUS_CONFIG } from "@/lib/opportunity-lifecycle";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { OppDetailPanel } from "@/components/opportunities/opp-detail-panel";
import { LifecyclePanel } from "@/components/opportunities/lifecycle-panel";
import { cn } from "@/lib/utils";
import type { OpportunityRow } from "@/lib/db/schema";
import type { OpportunityStatus } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type StatusFilter = OpportunityStatus | "all";
type SortKey = "discoveredAt" | "title";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTags(tagsJson: string): string[] {
  try {
    const arr = JSON.parse(tagsJson);
    return Array.isArray(arr) ? arr.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusCfg(status: string) {
  return (
    STATUS_CONFIG[status as OpportunityStatus] ?? STATUS_CONFIG["new"]
  );
}

// ── Filter config ─────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "validate-now", label: "Validate Now" },
  { value: "validating", label: "Validating" },
  { value: "investigating", label: "Investigating" },
  { value: "new", label: "New" },
  { value: "watch", label: "Watch" },
  { value: "rejected", label: "Rejected" },
];

// ── Sort icon ─────────────────────────────────────────────────────────────────

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

// ── Stats strip ───────────────────────────────────────────────────────────────

function StatsStrip({ opps }: { opps: OpportunityRow[] }) {
  const stats = [
    {
      label: "Total tracked",
      value: opps.length,
      highlight: false,
    },
    {
      label: "Ready to validate",
      value: opps.filter((o) => o.status === "validate-now").length,
      highlight: true,
    },
    {
      label: "Validating now",
      value: opps.filter((o) => o.status === "validating").length,
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(({ label, value, highlight }) => (
        <div
          key={label}
          className="bg-card border border-border rounded-lg px-4 py-3 space-y-1.5"
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">
            {label}
          </p>
          <p
            className={cn(
              "text-xl font-semibold font-mono tabular-nums",
              highlight && value > 0 ? "text-primary" : "text-foreground"
            )}
          >
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function OpportunitiesClient({
  initialOpps,
}: {
  initialOpps: OpportunityRow[];
}) {
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("discoveredAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(false);

  const selectedOpp = selectedId
    ? (initialOpps.find((o) => o.id === selectedId) ?? null)
    : null;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = useMemo(() => {
    let list = [...initialOpps];
    if (statusFilter !== "all") {
      list = list.filter((o) => o.status === statusFilter);
    }
    list.sort((a, b) => {
      if (sortKey === "title") {
        const d = a.title.localeCompare(b.title);
        return sortDir === "desc" ? -d : d;
      }
      const d =
        new Date(a.discoveredAt).getTime() -
        new Date(b.discoveredAt).getTime();
      return sortDir === "desc" ? -d : d;
    });
    return list;
  }, [initialOpps, statusFilter, sortKey, sortDir]);

  function handleSuccess() {
    setShowCreate(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
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
            onClick={() => {
              setShowCreate((v) => !v);
              setSelectedId(null);
              setEditing(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New Opportunity
          </button>
          <button
            disabled
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-md disabled:opacity-40"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Configure Radar
          </button>
        </div>
      </div>

      {/* ── Create form ──────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="bg-card border border-primary/20 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              New Opportunity
            </h2>
            <button
              onClick={() => setShowCreate(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <OpportunityForm
            mode="create"
            onSuccess={handleSuccess}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      <StatsStrip opps={initialOpps} />

      {/* ── Opportunity table ─────────────────────────────────────────────── */}
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
          </div>

          {/* Status filter pills */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map(({ value, label }) => {
              const count =
                value === "all"
                  ? initialOpps.length
                  : initialOpps.filter((o) => o.status === value).length;
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
                  <span className="font-mono text-[10px] opacity-60">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_120px_90px_80px] gap-3 px-5 py-2 border-b border-border bg-background/40">
          <button
            className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-widest text-left hover:text-foreground transition-colors"
            onClick={() => handleSort("title")}
          >
            Opportunity
            <SortIcon column="title" current={sortKey} dir={sortDir} />
          </button>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Customer
          </div>
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

        {/* Empty state — no records at all */}
        {initialOpps.length === 0 ? (
          <div className="px-5 py-16 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary/40" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                No opportunities yet
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Add your first opportunity to start tracking your research
                pipeline.
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              New Opportunity
            </button>
          </div>
        ) : filtered.length === 0 ? (
          /* Filter produced no results */
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No opportunities match the current filters.
          </div>
        ) : (
          /* Rows */
          <div className="divide-y divide-border">
            {filtered.map((opp) => {
              const cfg = statusCfg(opp.status);
              const isSelected = opp.id === selectedId;
              const tags = parseTags(opp.tags);

              return (
                <div
                  key={opp.id}
                  onClick={() => {
                    setSelectedId(isSelected ? null : opp.id);
                    setEditing(false);
                    setShowCreate(false);
                  }}
                  className={cn(
                    "grid grid-cols-[1fr_120px_90px_80px] gap-3 px-5 py-3.5 cursor-pointer hover:bg-secondary/20 transition-colors items-center",
                    isSelected && "bg-secondary/30"
                  )}
                >
                  {/* Title + problem + tags */}
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {opp.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 leading-snug">
                      {opp.problemStatement}
                    </p>
                    {tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                        {tags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground/40">
                            +{tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Customer type */}
                  <p className="text-[11px] text-muted-foreground truncate">
                    {opp.customerType || "—"}
                  </p>

                  {/* Status badge */}
                  <span
                    className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded w-fit",
                      cfg.bg,
                      cfg.color
                    )}
                  >
                    {cfg.label}
                  </span>

                  {/* Found date */}
                  <p className="font-mono text-[10px] text-muted-foreground/60">
                    {formatDate(opp.discoveredAt)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Selected opportunity detail panel ─────────────────────────────── */}
      {selectedOpp && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0",
                  statusCfg(selectedOpp.status).bg,
                  statusCfg(selectedOpp.status).color
                )}
              >
                {statusCfg(selectedOpp.status).label}
              </span>
              <h2 className="text-sm font-semibold text-foreground truncate">
                {selectedOpp.title}
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!editing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground border border-border rounded-md hover:text-foreground hover:bg-secondary/50 transition-all"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedId(null);
                  setEditing(false);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Panel body */}
          <div className="px-5 py-4">
            {editing ? (
              <OpportunityForm
                mode="edit"
                opportunityId={selectedOpp.id}
                initialValues={{
                  title: selectedOpp.title,
                  problemStatement: selectedOpp.problemStatement,
                  targetCustomer: selectedOpp.targetCustomer,
                  customerType: selectedOpp.customerType,
                  tags: parseTags(selectedOpp.tags),
                }}
                onSuccess={handleSuccess}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <div className="space-y-4">
                {/* Lifecycle — progress bar, transitions, checklist (when validating).
                    key remounts on both opportunity change and status change. */}
                <LifecyclePanel
                  key={`${selectedOpp.id}-${selectedOpp.status}`}
                  opp={selectedOpp}
                />

                {/* Problem statement */}
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Problem Statement
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {selectedOpp.problemStatement}
                  </p>
                </div>

                {/* Customer fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Target Customer
                    </p>
                    <p className="text-sm text-foreground">
                      {selectedOpp.targetCustomer ? (
                        selectedOpp.targetCustomer
                      ) : (
                        <span className="text-muted-foreground/40 italic">
                          Not set
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Customer Type
                    </p>
                    <p className="text-sm text-foreground">
                      {selectedOpp.customerType ? (
                        selectedOpp.customerType
                      ) : (
                        <span className="text-muted-foreground/40 italic">
                          Not set
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                {parseTags(selectedOpp.tags).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {parseTags(selectedOpp.tags).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded-md bg-secondary/60 text-muted-foreground border border-border"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discovered date */}
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Discovered
                  </p>
                  <p className="text-sm text-foreground font-mono">
                    {formatDate(selectedOpp.discoveredAt)}
                  </p>
                </div>

                {/* AI-era fields — rendered only when present */}
                {selectedOpp.recommendation && (
                  <div className="pt-3 border-t border-border space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      AI Recommendation
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {selectedOpp.recommendation}
                    </p>
                    {selectedOpp.recommendationReason && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {selectedOpp.recommendationReason}
                      </p>
                    )}
                  </div>
                )}

                {/* Evidence and research notes — fetched from DB per opportunity.
                    key={id} remounts the panel when selection changes, giving
                    it a clean initial state without synchronous effect setStates. */}
                <OppDetailPanel key={selectedOpp.id} opportunityId={selectedOpp.id} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
