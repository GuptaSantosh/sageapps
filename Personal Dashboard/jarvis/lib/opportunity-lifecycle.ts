/**
 * lib/opportunity-lifecycle.ts — Shared lifecycle configuration.
 *
 * This module is intentionally NOT server-only so it can be imported by both:
 *  - lib/db/queries.ts  (server-only DB layer)
 *  - Client components  (lifecycle-panel.tsx, opportunities-client.tsx, etc.)
 *
 * It contains only pure data — no Next.js imports, no Node.js APIs.
 *
 * ALLOWED_TRANSITIONS is derived from TRANSITIONS so the two are never out of sync.
 */

import type { OpportunityStatus } from "@/lib/types";

// ── Lifecycle main-path steps ─────────────────────────────────────────────────

export const LIFECYCLE_STEPS: { key: OpportunityStatus; label: string }[] = [
  { key: "new",          label: "Discovered"  },
  { key: "investigating",label: "Investigating"},
  { key: "validate-now", label: "Validate Now" },
  { key: "validating",   label: "Validating"  },
  { key: "build",        label: "Build"       },
];

export const LIFECYCLE_ORDER: OpportunityStatus[] = [
  "new", "investigating", "validate-now", "validating", "build",
];

// ── Status display config ─────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<
  OpportunityStatus,
  { label: string; color: string; bg: string }
> = {
  new:            { label: "New",           color: "text-blue-400",         bg: "bg-blue-500/10"    },
  investigating:  { label: "Investigating", color: "text-amber-400",        bg: "bg-amber-500/10"   },
  "validate-now": { label: "Validate Now",  color: "text-violet-400",       bg: "bg-violet-500/10"  },
  validating:     { label: "Validating",    color: "text-emerald-400",      bg: "bg-emerald-500/10" },
  build:          { label: "Build",         color: "text-emerald-300",      bg: "bg-emerald-500/15" },
  watch:          { label: "Watch",         color: "text-muted-foreground", bg: "bg-secondary/60"   },
  rejected:       { label: "Rejected",      color: "text-red-400",          bg: "bg-red-500/10"     },
  archived:       { label: "Archived",      color: "text-muted-foreground", bg: "bg-secondary/40"   },
};

// ── Transition configuration ──────────────────────────────────────────────────
// Single source of truth for allowed lifecycle moves.
// ALLOWED_TRANSITIONS (used by the server DB layer) is derived from this.

export interface TransitionConfig {
  label: string;
  targetStatus: OpportunityStatus;
  /** "primary" = forward move, "secondary" = park/reconsider, "danger" = reject */
  variant: "primary" | "secondary" | "danger";
  /** Watch / Reject — UI offers an optional reason textarea that becomes a status note */
  requiresNote?: boolean;
  /** Build — UI requires explicit confirmation before the action fires */
  requiresConfirm?: boolean;
}

export const TRANSITIONS: Record<OpportunityStatus, TransitionConfig[]> = {
  new: [
    { label: "Start Investigating", targetStatus: "investigating", variant: "primary" },
  ],
  investigating: [
    { label: "Mark: Validate Now", targetStatus: "validate-now", variant: "primary"                         },
    { label: "Watch",              targetStatus: "watch",         variant: "secondary", requiresNote: true   },
    { label: "Reject",             targetStatus: "rejected",      variant: "danger",    requiresNote: true   },
  ],
  "validate-now": [
    { label: "Begin Validating", targetStatus: "validating", variant: "primary"                          },
    { label: "Watch",             targetStatus: "watch",      variant: "secondary", requiresNote: true    },
    { label: "Reject",            targetStatus: "rejected",   variant: "danger",    requiresNote: true    },
  ],
  validating: [
    { label: "Move to Build", targetStatus: "build",    variant: "primary",   requiresConfirm: true },
    { label: "Watch",          targetStatus: "watch",    variant: "secondary", requiresNote: true    },
    { label: "Reject",         targetStatus: "rejected", variant: "danger",    requiresNote: true    },
  ],
  watch: [
    { label: "Reinvestigate", targetStatus: "investigating", variant: "secondary" },
  ],
  rejected: [
    { label: "Reconsider", targetStatus: "investigating", variant: "secondary" },
  ],
  build:    [],
  archived: [],
};

// ── Flat allowed-transitions map (for server-side enforcement) ────────────────
// Derived from TRANSITIONS — changing TRANSITIONS automatically updates this.

export const ALLOWED_TRANSITIONS: Record<OpportunityStatus, OpportunityStatus[]> = {
  new:            TRANSITIONS["new"].map(t => t.targetStatus),
  investigating:  TRANSITIONS["investigating"].map(t => t.targetStatus),
  "validate-now": TRANSITIONS["validate-now"].map(t => t.targetStatus),
  validating:     TRANSITIONS["validating"].map(t => t.targetStatus),
  watch:          TRANSITIONS["watch"].map(t => t.targetStatus),
  rejected:       TRANSITIONS["rejected"].map(t => t.targetStatus),
  build:          [],
  archived:       [],
};
