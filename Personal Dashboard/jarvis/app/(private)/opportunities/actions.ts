"use server";

/**
 * app/(private)/opportunities/actions.ts — Server Actions for the Opportunity Radar.
 *
 * Every action:
 *  1. Calls requireAuth() — redirects to /login if not authenticated.
 *  2. Validates inputs with Zod — returns { ok: false, error } on invalid input.
 *  3. Calls the relevant query helper — returns { ok: false, error } on DB error.
 *  4. Calls revalidatePath("/opportunities") so the page re-fetches on next visit.
 *  5. Returns { ok: true, data: T } on success.
 *
 * requireAuth() is called outside try/catch so Next.js redirect() exceptions
 * propagate correctly.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-server";
import {
  listOpportunities,
  getOpportunity,
  getEvidence,
  getNotes,
  getChecklist,
  createOpportunity,
  updateOpportunityFields,
  updateOpportunityStatus,
  updateChecklist,
  addEvidence,
  removeEvidence,
  updateEvidence,
  addNote,
  removeNote,
  updateNote,
  updateEvaluation,
} from "@/lib/db/queries";
import type { OpportunityRow, EvidenceRow, NoteRow, ChecklistRow } from "@/lib/db/schema";
import { evaluateOpportunity } from "@/lib/ai/evaluate-opportunity";
import { scoreToDecision } from "@/lib/ai/rubric";
import type { OpportunityEvaluation } from "@/lib/types";

// ── Action result type ─────────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ── Zod schemas ───────────────────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const CreateOpportunitySchema = z.object({
  title:            z.string().min(1, "Title is required").max(200),
  problemStatement: z.string().min(1, "Problem statement is required").max(2000),
  targetCustomer:   z.string().max(200).default(""),
  customerType:     z.string().max(200).default(""),
  discoveredAt:     z.string().regex(DATE_RE, "discoveredAt must be YYYY-MM-DD"),
  tags:             z.array(z.string().max(50)).max(20).default([]),
});

const UpdateFieldsSchema = z.object({
  title:            z.string().min(1).max(200).optional(),
  problemStatement: z.string().min(1).max(2000).optional(),
  targetCustomer:   z.string().max(200).optional(),
  customerType:     z.string().max(200).optional(),
  tags:             z.array(z.string().max(50)).max(20).optional(),
  lastSeenAt:       z.string().regex(DATE_RE).optional(),
});

const UpdateStatusSchema = z.object({
  targetStatus: z.enum([
    "new", "investigating", "validate-now", "validating",
    "build", "watch", "rejected", "archived",
  ]),
  noteBody: z.string().max(5000).optional(),
});

const UpdateChecklistSchema = z.object({
  usersIdentified:        z.number().int().min(0).max(1).optional(),
  conversationsCompleted: z.number().int().min(0).max(5).optional(),
  problemConfirmed:       z.number().int().min(0).max(3).optional(),
  solutionRequested:      z.number().int().min(0).max(2).optional(),
  willingnessToPaySignal: z.number().int().min(0).max(1).optional(),
  workaroundDocumented:   z.number().int().min(0).max(1).optional(),
});

const AddEvidenceSchema = z.object({
  url: z
    .string()
    .url("Must be a valid URL")
    .refine(
      (u) => u.startsWith("http://") || u.startsWith("https://"),
      "Only HTTP and HTTPS URLs are allowed"
    ),
  title:      z.string().max(500).optional(),
  platform:   z.string().max(100).optional(),
  signalType: z
    .enum([
      "complaint", "request", "workaround", "spending-intent",
      "competitor-dissatisfaction", "repeated-manual-workflow",
    ])
    .optional(),
  author:     z.string().max(200).optional(),
  observedAt: z.string().regex(DATE_RE).optional(),
  summary:    z.string().max(2000).optional(),
});

const AddNoteSchema = z.object({
  noteType: z.enum(["research", "status"]).default("research"),
  body:     z.string().min(1, "Note body is required").max(10000),
});

const UpdateEvidenceSchema = z.object({
  url: z
    .string()
    .url("Must be a valid URL")
    .refine(
      (u) => u.startsWith("http://") || u.startsWith("https://"),
      "Only HTTP and HTTPS URLs are allowed"
    ),
  title:    z.string().max(500).optional(),
  platform: z.string().max(100).optional(),
  summary:  z.string().max(2000).optional(),
});

const UpdateNoteSchema = z.object({
  noteType: z.enum(["research", "status"]).default("research"),
  body:     z.string().min(1, "Note body is required").max(10000),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function firstIssue(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Invalid input";
}

// ── Read actions ──────────────────────────────────────────────────────────────

/** List all opportunities, optionally filtered by status */
export async function listOpportunitiesAction(
  opts?: { status?: string }
): Promise<ActionResult<OpportunityRow[]>> {
  await requireAuth();
  try {
    return { ok: true, data: listOpportunities(opts) };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to list opportunities");
  }
}

/** Get a single opportunity with its evidence, notes and checklist */
export async function getOpportunityAction(id: string): Promise<
  ActionResult<{
    opportunity: OpportunityRow;
    evidence: EvidenceRow[];
    notes: NoteRow[];
    checklist: ChecklistRow | undefined;
  }>
> {
  await requireAuth();
  try {
    if (!id) return fail("Opportunity ID is required");
    const opportunity = getOpportunity(id);
    if (!opportunity) return fail("Opportunity not found");
    return {
      ok: true,
      data: {
        opportunity,
        evidence:  getEvidence(id),
        notes:     getNotes(id),
        checklist: getChecklist(id),
      },
    };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load opportunity");
  }
}

// ── Mutation actions ──────────────────────────────────────────────────────────

/** Create a new opportunity (status starts at 'new') */
export async function createOpportunityAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  await requireAuth();
  try {
    const parsed = CreateOpportunitySchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const { tags, ...rest } = parsed.data;
    const id = crypto.randomUUID();
    const row = createOpportunity({
      id,
      ...rest,
      lastSeenAt: rest.discoveredAt,
      tags: JSON.stringify(tags),
    });
    revalidatePath("/opportunities");
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create opportunity");
  }
}

/** Update one or more core opportunity fields */
export async function updateOpportunityFieldsAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  await requireAuth();
  try {
    if (!id) return fail("Opportunity ID is required");
    const parsed = UpdateFieldsSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const { tags, ...rest } = parsed.data;
    updateOpportunityFields(id, {
      ...rest,
      ...(tags !== undefined ? { tags: JSON.stringify(tags) } : {}),
    });
    revalidatePath("/opportunities");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update opportunity");
  }
}

/**
 * Transition an opportunity to a new lifecycle status.
 *
 * Validates the transition is in ALLOWED_TRANSITIONS[currentStatus].
 * Entering 'validating' automatically provisions a blank checklist.
 * An optional noteBody is stored as a 'status' note.
 */
export async function updateOpportunityStatusAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  await requireAuth();
  try {
    if (!id) return fail("Opportunity ID is required");
    const parsed = UpdateStatusSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));

    updateOpportunityStatus(id, parsed.data.targetStatus, parsed.data.noteBody);
    revalidatePath("/opportunities");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update status");
  }
}

/** Update one or more validation checklist fields */
export async function updateChecklistAction(
  opportunityId: string,
  input: unknown
): Promise<ActionResult> {
  await requireAuth();
  try {
    if (!opportunityId) return fail("Opportunity ID is required");
    const parsed = UpdateChecklistSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const fields = parsed.data;
    if (Object.keys(fields).length === 0) return fail("No checklist fields provided");
    updateChecklist(opportunityId, fields);
    revalidatePath("/opportunities");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update checklist");
  }
}

/** Add an evidence URL to an opportunity (HTTP/HTTPS only) */
export async function addEvidenceAction(
  opportunityId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  await requireAuth();
  try {
    if (!opportunityId) return fail("Opportunity ID is required");
    const parsed = AddEvidenceSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const row = addEvidence(opportunityId, {
      id: crypto.randomUUID(),
      ...parsed.data,
    });
    revalidatePath("/opportunities");
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to add evidence");
  }
}

/** Remove a single evidence record */
export async function removeEvidenceAction(
  evidenceId: string
): Promise<ActionResult> {
  await requireAuth();
  try {
    if (!evidenceId) return fail("Evidence ID is required");
    removeEvidence(evidenceId);
    revalidatePath("/opportunities");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to remove evidence");
  }
}

/** Add a research or status note to an opportunity */
export async function addNoteAction(
  opportunityId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  await requireAuth();
  try {
    if (!opportunityId) return fail("Opportunity ID is required");
    const parsed = AddNoteSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const row = addNote(opportunityId, {
      id: crypto.randomUUID(),
      noteType: parsed.data.noteType as "research" | "status",
      body: parsed.data.body,
    });
    revalidatePath("/opportunities");
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to add note");
  }
}

/** Update an existing evidence record */
export async function updateEvidenceAction(
  evidenceId: string,
  input: unknown
): Promise<ActionResult> {
  await requireAuth();
  try {
    if (!evidenceId) return fail("Evidence ID is required");
    const parsed = UpdateEvidenceSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    updateEvidence(evidenceId, {
      url:      parsed.data.url,
      title:    parsed.data.title || null,
      platform: parsed.data.platform || null,
      summary:  parsed.data.summary || null,
    });
    revalidatePath("/opportunities");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update evidence");
  }
}

/** Update an existing note body or type */
export async function updateNoteAction(
  noteId: string,
  input: unknown
): Promise<ActionResult> {
  await requireAuth();
  try {
    if (!noteId) return fail("Note ID is required");
    const parsed = UpdateNoteSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    updateNote(noteId, {
      noteType: parsed.data.noteType as "research" | "status",
      body:     parsed.data.body,
    });
    revalidatePath("/opportunities");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update note");
  }
}

/** Remove a note */
export async function removeNoteAction(noteId: string): Promise<ActionResult> {
  await requireAuth();
  try {
    if (!noteId) return fail("Note ID is required");
    removeNote(noteId);
    revalidatePath("/opportunities");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to remove note");
  }
}

// ── AI Evaluation ─────────────────────────────────────────────────────────────

export interface EvaluationResult {
  evalScore:            number;
  decision:             string;
  evaluatedAt:          string;
  evaluation:           OpportunityEvaluation;
}

/**
 * Run the V0.1 rubric AI evaluation against a single opportunity.
 *
 * Loads the opportunity + all evidence + research notes, calls Claude via
 * evaluateOpportunity(), persists the five evaluation fields to the DB,
 * and revalidates the opportunities path.
 *
 * Does NOT change the opportunity lifecycle status — evaluation is advisory only.
 */
export async function evaluateOpportunityAction(
  id: string
): Promise<ActionResult<EvaluationResult>> {
  await requireAuth();
  try {
    if (!id) return fail("Opportunity ID is required");

    const opp = getOpportunity(id);
    if (!opp) return fail("Opportunity not found");

    const evidence = getEvidence(id);
    const notes    = getNotes(id);

    // Parse stored JSON fields safely
    let tags: string[] = [];
    try { tags = JSON.parse(opp.tags ?? "[]"); } catch { tags = []; }

    const evaluation = await evaluateOpportunity({
      title:            opp.title,
      problemStatement: opp.problemStatement,
      targetCustomer:   opp.targetCustomer ?? "",
      customerType:     opp.customerType   ?? "",
      tags,
      discoveredAt:     opp.discoveredAt,
      thesisProblem:    opp.thesisProblem    ?? null,
      thesisWho:        opp.thesisWho        ?? null,
      thesisWhyHurts:   opp.thesisWhyHurts   ?? null,
      thesisWhyPay:     opp.thesisWhyPay     ?? null,
      thesisWhyNow:     opp.thesisWhyNow     ?? null,
      evidence: evidence.map(e => ({
        url:        e.url,
        title:      e.title       ?? null,
        platform:   e.platform    ?? null,
        signalType: e.signalType  ?? null,
        author:     e.author      ?? null,
        summary:    e.summary     ?? null,
      })),
      notes: notes.map(n => ({
        noteType:  n.noteType,
        body:      n.body,
        createdAt: n.createdAt,
      })),
    });

    const evalScore = Math.round(evaluation.scorecard.totalScore);
    const decision  = scoreToDecision(evaluation.scorecard.totalScore);

    // One-sentence summary of the strongest objection as the recommendation reason
    const recommendationReason = evaluation.narrative.strongestObjection;

    updateEvaluation(id, {
      evalScore,
      evaluatedAt:          evaluation.evaluatedAt,
      recommendation:       decision,
      recommendationReason,
      scorecard:            JSON.stringify(evaluation),
    });

    revalidatePath("/opportunities");
    return {
      ok:   true,
      data: { evalScore, decision, evaluatedAt: evaluation.evaluatedAt, evaluation },
    };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "AI evaluation failed");
  }
}
