/**
 * lib/db/queries.ts — Typed query helpers for the Jarvis SQLite database.
 *
 * Rules:
 *  - Pure DB layer. No Next.js imports (no revalidatePath, no redirect).
 *  - No authentication — callers (server actions) must authenticate before calling.
 *  - Throws on unexpected DB errors; callers wrap in try/catch.
 *  - updateOpportunityStatus is atomic: status + optional status note +
 *    blank checklist provisioning happen inside a single transaction.
 */

import "server-only";
import { eq, desc } from "drizzle-orm";
import { getDb } from "./index";
import {
  opportunities,
  opportunityEvidence,
  opportunityNotes,
  validationChecklist,
  type OpportunityRow,
  type EvidenceRow,
  type NoteRow,
  type ChecklistRow,
} from "./schema";
import type { OpportunityStatus } from "@/lib/types";

// ── Allowed lifecycle transitions ─────────────────────────────────────────────
// Mirrors TRANSITIONS in components/opportunities/opp-detail.tsx.

export const ALLOWED_TRANSITIONS: Record<OpportunityStatus, OpportunityStatus[]> = {
  new:            ["investigating"],
  investigating:  ["validate-now", "watch", "rejected"],
  "validate-now": ["validating", "watch", "rejected"],
  validating:     ["build", "watch", "rejected"],
  watch:          ["investigating"],
  rejected:       ["investigating"],
  build:          [],
  archived:       [],
};

// ── Timestamp helper ──────────────────────────────────────────────────────────
// Matches SQLite datetime('now') format: YYYY-MM-DD HH:MM:SS (UTC).

function nowIso(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

// ── Read queries ──────────────────────────────────────────────────────────────

export function listOpportunities(opts?: { status?: string }): OpportunityRow[] {
  const db = getDb();
  if (opts?.status) {
    return db
      .select()
      .from(opportunities)
      .where(eq(opportunities.status, opts.status))
      .orderBy(desc(opportunities.discoveredAt))
      .all();
  }
  return db
    .select()
    .from(opportunities)
    .orderBy(desc(opportunities.discoveredAt))
    .all();
}

export function getOpportunity(id: string): OpportunityRow | undefined {
  return getDb()
    .select()
    .from(opportunities)
    .where(eq(opportunities.id, id))
    .get();
}

export function getEvidence(opportunityId: string): EvidenceRow[] {
  return getDb()
    .select()
    .from(opportunityEvidence)
    .where(eq(opportunityEvidence.opportunityId, opportunityId))
    .all();
}

export function getNotes(opportunityId: string): NoteRow[] {
  return getDb()
    .select()
    .from(opportunityNotes)
    .where(eq(opportunityNotes.opportunityId, opportunityId))
    .orderBy(desc(opportunityNotes.createdAt))
    .all();
}

export function getChecklist(opportunityId: string): ChecklistRow | undefined {
  return getDb()
    .select()
    .from(validationChecklist)
    .where(eq(validationChecklist.opportunityId, opportunityId))
    .get();
}

// ── Mutation input types ──────────────────────────────────────────────────────

export interface CreateOpportunityInput {
  id: string;
  title: string;
  problemStatement: string;
  targetCustomer: string;
  customerType: string;
  discoveredAt: string;
  lastSeenAt: string;
  tags: string; // JSON array string e.g. '["Tax","India"]'
}

export interface UpdateFieldsInput {
  title?: string;
  problemStatement?: string;
  targetCustomer?: string;
  customerType?: string;
  tags?: string; // JSON array string
  lastSeenAt?: string;
}

export interface UpdateChecklistInput {
  usersIdentified?: number;
  conversationsCompleted?: number;
  problemConfirmed?: number;
  solutionRequested?: number;
  willingnessToPaySignal?: number;
  workaroundDocumented?: number;
}

export interface AddEvidenceInput {
  id: string;
  url: string;
  title?: string;
  platform?: string;
  signalType?: string;
  author?: string;
  observedAt?: string;
  summary?: string;
}

export interface AddNoteInput {
  id: string;
  noteType: "research" | "status";
  body: string;
}

// ── Write queries ─────────────────────────────────────────────────────────────

export function createOpportunity(input: CreateOpportunityInput): OpportunityRow {
  const now = nowIso();
  return getDb()
    .insert(opportunities)
    .values({ ...input, status: "new", createdAt: now, updatedAt: now })
    .returning()
    .get()!;
}

export function updateOpportunityFields(id: string, fields: UpdateFieldsInput): void {
  if (Object.keys(fields).length === 0) return;
  getDb()
    .update(opportunities)
    .set({ ...fields, updatedAt: nowIso() })
    .where(eq(opportunities.id, id))
    .run();
}

/**
 * Atomic status transition.
 *
 * Everything happens in a single transaction:
 *  1. Verify the opportunity exists and the transition is allowed.
 *  2. Update the status.
 *  3. If entering 'validating' for the first time, provision a blank checklist.
 *  4. If noteBody is supplied, insert an opportunity_notes row (type 'status').
 *
 * Throws if the opportunity is not found or the transition is not allowed;
 * the transaction is rolled back automatically.
 */
export function updateOpportunityStatus(
  id: string,
  targetStatus: OpportunityStatus,
  noteBody?: string
): void {
  const db = getDb();
  const now = nowIso();

  db.transaction((tx) => {
    const opp = tx
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, id))
      .get();
    if (!opp) throw new Error(`Opportunity ${id} not found`);

    const current = opp.status as OpportunityStatus;
    const allowed = ALLOWED_TRANSITIONS[current] ?? [];
    if (!allowed.includes(targetStatus)) {
      throw new Error(
        `Transition from '${current}' to '${targetStatus}' is not allowed`
      );
    }

    // 1. Update status
    tx.update(opportunities)
      .set({ status: targetStatus, updatedAt: now })
      .where(eq(opportunities.id, id))
      .run();

    // 2. Provision blank checklist when entering 'validating'
    if (targetStatus === "validating") {
      const existing = tx
        .select()
        .from(validationChecklist)
        .where(eq(validationChecklist.opportunityId, id))
        .get();
      if (!existing) {
        tx.insert(validationChecklist)
          .values({ opportunityId: id, updatedAt: now })
          .run();
      }
    }

    // 3. Attach a status note if provided
    if (noteBody?.trim()) {
      tx.insert(opportunityNotes)
        .values({
          id: crypto.randomUUID(),
          opportunityId: id,
          noteType: "status",
          body: noteBody.trim(),
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }
  });
}

export function updateChecklist(
  opportunityId: string,
  fields: UpdateChecklistInput
): void {
  if (Object.keys(fields).length === 0) return;
  getDb()
    .update(validationChecklist)
    .set({ ...fields, updatedAt: nowIso() })
    .where(eq(validationChecklist.opportunityId, opportunityId))
    .run();
}

export function addEvidence(
  opportunityId: string,
  input: AddEvidenceInput
): EvidenceRow {
  return getDb()
    .insert(opportunityEvidence)
    .values({ ...input, opportunityId, createdAt: nowIso() })
    .returning()
    .get()!;
}

export function removeEvidence(evidenceId: string): void {
  getDb()
    .delete(opportunityEvidence)
    .where(eq(opportunityEvidence.id, evidenceId))
    .run();
}

export function addNote(opportunityId: string, input: AddNoteInput): NoteRow {
  const now = nowIso();
  return getDb()
    .insert(opportunityNotes)
    .values({ ...input, opportunityId, createdAt: now, updatedAt: now })
    .returning()
    .get()!;
}

export function removeNote(noteId: string): void {
  getDb()
    .delete(opportunityNotes)
    .where(eq(opportunityNotes.id, noteId))
    .run();
}
