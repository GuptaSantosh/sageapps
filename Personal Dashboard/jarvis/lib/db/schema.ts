/**
 * lib/db/schema.ts — Drizzle ORM table definitions for Jarvis SQLite database.
 *
 * Design rules:
 *  - AI-era fields (scorecard, recommendation, detailed thesis) are nullable so
 *    a genuine opportunity can be created without AI evaluation data.
 *  - Child tables use ON DELETE CASCADE; deleting an opportunity removes all
 *    related evidence, notes and checklist rows automatically.
 *  - Status and signal_type values mirror the TypeScript union types in lib/types.ts;
 *    enforcement is at the query/action layer, not via DB check constraints, to
 *    keep the schema portable.
 *  - Timestamps use SQLite datetime('now') defaults (UTC text ISO strings).
 *  - No lifecycle-event/audit-history table in V1.
 *  - No seed data — production starts empty.
 */

import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ── opportunities ─────────────────────────────────────────────────────────────
//
// Core manually-entered fields + lifecycle status.
// AI-era fields (scorecard, recommendation, thesis detail) are TEXT/nullable so
// they can be omitted when creating a real opportunity without AI evaluation.

export const opportunities = sqliteTable(
  "opportunities",
  {
    id:               text("id").primaryKey(),

    // Required at creation
    title:            text("title").notNull(),
    problemStatement: text("problem_statement").notNull(),
    targetCustomer:   text("target_customer").notNull().default(""),
    customerType:     text("customer_type").notNull().default(""),

    // Lifecycle — mirrors OpportunityStatus in lib/types.ts
    // Values: 'new' | 'investigating' | 'validate-now' | 'validating' | 'build' | 'watch' | 'rejected' | 'archived'
    status: text("status").notNull().default("new"),

    // Tags stored as a JSON array string, e.g. '["Tax","India"]'
    tags: text("tags").notNull().default("[]"),

    // Dates (ISO date strings, e.g. '2026-08-20')
    discoveredAt: text("discovered_at").notNull(),
    lastSeenAt:   text("last_seen_at").notNull(),

    // 'private' | 'demo' | null
    mode: text("mode"),

    // ── AI-era fields — all nullable ────────────────────────────────────────
    // These are populated by AI evaluation (Step 5.4+); V1 creates without them.

    // OpportunityRecommendation: 'Validate Now' | 'Investigate' | 'Watch' | 'Ignore'
    recommendation:       text("recommendation"),
    recommendationReason: text("recommendation_reason"),

    // OpportunityThesis decomposed into nullable columns (avoids JSON parsing for list views)
    thesisProblem:     text("thesis_problem"),
    thesisWho:         text("thesis_who"),
    thesisWhyHurts:    text("thesis_why_hurts"),
    thesisWhyPay:      text("thesis_why_pay"),
    thesisWhyNow:      text("thesis_why_now"),

    // DetailedScorecard stored as JSON (10 dimensions × {score, justification} + overall + weightedNote)
    // Only written by AI evaluation; null until then.
    scorecard: text("scorecard"),

    // CompetitiveAlternative[] stored as JSON array
    alternatives: text("alternatives"),

    // ValidationPlan stored as JSON
    validationPlan: text("validation_plan"),

    // ── Timestamps ──────────────────────────────────────────────────────────
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    // Filter by status is the most common query
    index("idx_opportunities_status").on(t.status),
    // Sort by discovered_at (newest first)
    index("idx_opportunities_discovered_at").on(t.discoveredAt),
  ]
);

// ── opportunity_evidence ──────────────────────────────────────────────────────
//
// Multiple manually entered source URLs/evidence records per opportunity.
// Replaces the EvidenceSignal[] array previously embedded in OpportunityRecord.
// url is the only required field; all others are optional research metadata.

export const opportunityEvidence = sqliteTable(
  "opportunity_evidence",
  {
    id:            text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),

    // The one required field — the actual source URL
    url: text("url").notNull(),

    // Optional research metadata
    title:      text("title"),
    platform:   text("platform"),   // e.g. 'Reddit', 'Indie Hackers', 'Product Hunt'

    // SignalType: 'complaint' | 'request' | 'workaround' | 'spending-intent'
    //           | 'competitor-dissatisfaction' | 'repeated-manual-workflow'
    signalType: text("signal_type"),

    author:     text("author"),
    observedAt: text("observed_at"),  // ISO date string
    summary:    text("summary"),      // 1–2 sentence signal summary

    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    index("idx_evidence_opportunity_id").on(t.opportunityId),
  ]
);

// ── opportunity_notes ─────────────────────────────────────────────────────────
//
// Multiple freeform notes per opportunity.
// note_type distinguishes ongoing research notes from status-transition reasons.
// Not restricted to one rejection-reason or watch-note (unlike the prior React state).

export const opportunityNotes = sqliteTable(
  "opportunity_notes",
  {
    id:            text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),

    // 'research' — ongoing freeform research notes
    // 'status'   — reason attached to a status transition (rejection, watch, etc.)
    noteType: text("note_type").notNull().default("research"),

    body: text("body").notNull(),

    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    index("idx_notes_opportunity_id").on(t.opportunityId),
    index("idx_notes_type").on(t.noteType),
  ]
);

// ── validation_checklist ──────────────────────────────────────────────────────
//
// One row per opportunity; auto-provisioned when status enters 'validating'.
// Mirrors the ValidationChecklist interface in lib/types.ts exactly:
//   usersIdentified: boolean          → INTEGER 0/1
//   conversationsCompleted: number    → INTEGER 0–5
//   problemConfirmed: number          → INTEGER 0–3
//   solutionRequested: number         → INTEGER 0–2
//   willingnessToPaySignal: boolean   → INTEGER 0/1
//   workaroundDocumented: boolean     → INTEGER 0/1

export const validationChecklist = sqliteTable("validation_checklist", {
  opportunityId: text("opportunity_id")
    .primaryKey()
    .references(() => opportunities.id, { onDelete: "cascade" }),

  usersIdentified:          integer("users_identified").notNull().default(0),
  conversationsCompleted:   integer("conversations_completed").notNull().default(0),
  problemConfirmed:         integer("problem_confirmed").notNull().default(0),
  solutionRequested:        integer("solution_requested").notNull().default(0),
  willingnessToPaySignal:   integer("willingness_to_pay_signal").notNull().default(0),
  workaroundDocumented:     integer("workaround_documented").notNull().default(0),

  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ── Type exports ──────────────────────────────────────────────────────────────
// Inferred insert/select types for use in query helpers and server actions.

export type OpportunityRow    = typeof opportunities.$inferSelect;
export type NewOpportunity    = typeof opportunities.$inferInsert;
export type EvidenceRow       = typeof opportunityEvidence.$inferSelect;
export type NewEvidence       = typeof opportunityEvidence.$inferInsert;
export type NoteRow           = typeof opportunityNotes.$inferSelect;
export type NewNote           = typeof opportunityNotes.$inferInsert;
export type ChecklistRow      = typeof validationChecklist.$inferSelect;
export type NewChecklist      = typeof validationChecklist.$inferInsert;
