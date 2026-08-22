"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, ExternalLink, Pencil } from "lucide-react";
import {
  getOpportunityAction,
  addEvidenceAction,
  removeEvidenceAction,
  updateEvidenceAction,
  addNoteAction,
  removeNoteAction,
  updateNoteAction,
} from "@/app/(private)/opportunities/actions";
import { cn } from "@/lib/utils";
import type { EvidenceRow, NoteRow } from "@/lib/db/schema";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const inputCls =
  "w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50";

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders evidence links and research notes for a single opportunity.
 *
 * This component is mounted with a `key={opportunityId}` by its parent, so
 * React unmounts and remounts it whenever the selected opportunity changes.
 * That means the initial state is always clean and we never need synchronous
 * setState inside the effect body.
 */
export function OppDetailPanel({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const router = useRouter();

  // ── Data state ───────────────────────────────────────────────────────────

  const [evidence, setEvidence] = useState<EvidenceRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Add-evidence form state ──────────────────────────────────────────────

  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [addEvidenceUrl, setAddEvidenceUrl] = useState("");
  const [addEvidenceTitle, setAddEvidenceTitle] = useState("");
  const [addEvidencePlatform, setAddEvidencePlatform] = useState("");
  const [addEvidenceSummary, setAddEvidenceSummary] = useState("");
  const [addEvidenceError, setAddEvidenceError] = useState<string | null>(null);
  const [isAddingEvidence, startAddEvidence] = useTransition();
  const [removingEvidenceId, setRemovingEvidenceId] = useState<string | null>(null);

  // ── Edit-evidence state ──────────────────────────────────────────────────

  const [editingEvidenceId, setEditingEvidenceId] = useState<string | null>(null);
  const [editEvidenceUrl, setEditEvidenceUrl] = useState("");
  const [editEvidenceTitle, setEditEvidenceTitle] = useState("");
  const [editEvidencePlatform, setEditEvidencePlatform] = useState("");
  const [editEvidenceSummary, setEditEvidenceSummary] = useState("");
  const [editEvidenceError, setEditEvidenceError] = useState<string | null>(null);
  const [isSavingEvidence, startSaveEvidence] = useTransition();

  // ── Add-note form state ──────────────────────────────────────────────────

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [addNoteBody, setAddNoteBody] = useState("");
  const [addNoteType, setAddNoteType] = useState<"research" | "status">("research");
  const [addNoteError, setAddNoteError] = useState<string | null>(null);
  const [isAddingNote, startAddNote] = useTransition();
  const [removingNoteId, setRemovingNoteId] = useState<string | null>(null);

  // ── Edit-note state ──────────────────────────────────────────────────────

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteBody, setEditNoteBody] = useState("");
  const [editNoteType, setEditNoteType] = useState<"research" | "status">("research");
  const [editNoteError, setEditNoteError] = useState<string | null>(null);
  const [isSavingNote, startSaveNote] = useTransition();

  // ── Initial fetch ────────────────────────────────────────────────────────

  // Component is remounted (key prop) when opportunityId changes, so this
  // effect only needs to run once per mount. All setStates happen inside
  // the .then() callback — not synchronously in the effect body.
  useEffect(() => {
    let aborted = false;
    getOpportunityAction(opportunityId).then((result) => {
      if (aborted) return;
      setLoading(false);
      if (result.ok) {
        setEvidence(result.data.evidence);
        setNotes(result.data.notes);
      } else {
        setLoadError(result.error);
      }
    });
    return () => {
      aborted = true;
    };
    // opportunityId is stable for the lifetime of this mount (key prop resets)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Shared re-fetch helper ───────────────────────────────────────────────

  async function reloadPanel() {
    const detail = await getOpportunityAction(opportunityId);
    if (detail.ok) {
      setEvidence(detail.data.evidence);
      setNotes(detail.data.notes);
    }
    router.refresh();
  }

  // ── Add evidence ─────────────────────────────────────────────────────────

  function resetAddEvidenceForm() {
    setAddEvidenceUrl("");
    setAddEvidenceTitle("");
    setAddEvidencePlatform("");
    setAddEvidenceSummary("");
    setAddEvidenceError(null);
    setShowEvidenceForm(false);
  }

  function handleAddEvidence(e: React.FormEvent) {
    e.preventDefault();
    setAddEvidenceError(null);
    startAddEvidence(async () => {
      const result = await addEvidenceAction(opportunityId, {
        url:      addEvidenceUrl.trim(),
        title:    addEvidenceTitle.trim() || undefined,
        platform: addEvidencePlatform.trim() || undefined,
        summary:  addEvidenceSummary.trim() || undefined,
      });
      if (result.ok) {
        resetAddEvidenceForm();
        await reloadPanel();
      } else {
        setAddEvidenceError(result.error);
      }
    });
  }

  // ── Remove evidence ───────────────────────────────────────────────────────

  async function handleRemoveEvidence(id: string) {
    if (!window.confirm("Remove this evidence link?")) return;
    setRemovingEvidenceId(id);
    const result = await removeEvidenceAction(id);
    setRemovingEvidenceId(null);
    if (result.ok) {
      setEvidence((prev) => prev.filter((ev) => ev.id !== id));
      router.refresh();
    }
  }

  // ── Edit evidence ─────────────────────────────────────────────────────────

  function startEditEvidence(ev: EvidenceRow) {
    setEditingEvidenceId(ev.id);
    setEditEvidenceUrl(ev.url);
    setEditEvidenceTitle(ev.title ?? "");
    setEditEvidencePlatform(ev.platform ?? "");
    setEditEvidenceSummary(ev.summary ?? "");
    setEditEvidenceError(null);
    // Close add form if open
    setShowEvidenceForm(false);
  }

  function cancelEditEvidence() {
    setEditingEvidenceId(null);
    setEditEvidenceError(null);
  }

  function handleSaveEvidence(e: React.FormEvent) {
    e.preventDefault();
    setEditEvidenceError(null);
    startSaveEvidence(async () => {
      const result = await updateEvidenceAction(editingEvidenceId!, {
        url:      editEvidenceUrl.trim(),
        title:    editEvidenceTitle.trim() || undefined,
        platform: editEvidencePlatform.trim() || undefined,
        summary:  editEvidenceSummary.trim() || undefined,
      });
      if (result.ok) {
        setEditingEvidenceId(null);
        await reloadPanel();
      } else {
        setEditEvidenceError(result.error);
      }
    });
  }

  // ── Add note ──────────────────────────────────────────────────────────────

  function resetAddNoteForm() {
    setAddNoteBody("");
    setAddNoteType("research");
    setAddNoteError(null);
    setShowNoteForm(false);
  }

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    setAddNoteError(null);
    startAddNote(async () => {
      const result = await addNoteAction(opportunityId, {
        noteType: addNoteType,
        body:     addNoteBody.trim(),
      });
      if (result.ok) {
        resetAddNoteForm();
        await reloadPanel();
      } else {
        setAddNoteError(result.error);
      }
    });
  }

  // ── Remove note ───────────────────────────────────────────────────────────

  async function handleRemoveNote(id: string) {
    if (!window.confirm("Remove this note?")) return;
    setRemovingNoteId(id);
    const result = await removeNoteAction(id);
    setRemovingNoteId(null);
    if (result.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      router.refresh();
    }
  }

  // ── Edit note ─────────────────────────────────────────────────────────────

  function startEditNote(note: NoteRow) {
    setEditingNoteId(note.id);
    setEditNoteBody(note.body);
    setEditNoteType(note.noteType as "research" | "status");
    setEditNoteError(null);
    // Close add form if open
    setShowNoteForm(false);
  }

  function cancelEditNote() {
    setEditingNoteId(null);
    setEditNoteError(null);
  }

  function handleSaveNote(e: React.FormEvent) {
    e.preventDefault();
    setEditNoteError(null);
    startSaveNote(async () => {
      const result = await updateNoteAction(editingNoteId!, {
        noteType: editNoteType,
        body:     editNoteBody.trim(),
      });
      if (result.ok) {
        setEditingNoteId(null);
        await reloadPanel();
      } else {
        setEditNoteError(result.error);
      }
    });
  }

  // ── Loading / error ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading evidence and notes…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="pt-4 border-t border-border text-xs text-red-400">
        Failed to load evidence and notes: {loadError}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pt-4 border-t border-border">
      {/* ── Evidence ──────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Evidence ({evidence.length})
          </p>
          {!showEvidenceForm && !editingEvidenceId && (
            <button
              onClick={() => setShowEvidenceForm(true)}
              className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          )}
        </div>

        {/* Add evidence form */}
        {showEvidenceForm && (
          <EvidenceForm
            url={addEvidenceUrl}
            title={addEvidenceTitle}
            platform={addEvidencePlatform}
            summary={addEvidenceSummary}
            error={addEvidenceError}
            isPending={isAddingEvidence}
            submitLabel="Add evidence"
            pendingLabel="Adding…"
            onUrlChange={setAddEvidenceUrl}
            onTitleChange={setAddEvidenceTitle}
            onPlatformChange={setAddEvidencePlatform}
            onSummaryChange={setAddEvidenceSummary}
            onSubmit={handleAddEvidence}
            onCancel={resetAddEvidenceForm}
          />
        )}

        {/* Evidence list */}
        {evidence.length === 0 && !showEvidenceForm ? (
          <p className="text-xs text-muted-foreground/50 italic">
            No evidence links yet.
          </p>
        ) : (
          <div className="space-y-2">
            {evidence.map((ev) =>
              editingEvidenceId === ev.id ? (
                /* Inline edit form */
                <div key={ev.id} className="bg-secondary/20 border border-primary/20 rounded-md p-3">
                  <EvidenceForm
                    url={editEvidenceUrl}
                    title={editEvidenceTitle}
                    platform={editEvidencePlatform}
                    summary={editEvidenceSummary}
                    error={editEvidenceError}
                    isPending={isSavingEvidence}
                    submitLabel="Save changes"
                    pendingLabel="Saving…"
                    onUrlChange={setEditEvidenceUrl}
                    onTitleChange={setEditEvidenceTitle}
                    onPlatformChange={setEditEvidencePlatform}
                    onSummaryChange={setEditEvidenceSummary}
                    onSubmit={handleSaveEvidence}
                    onCancel={cancelEditEvidence}
                  />
                </div>
              ) : (
                /* Read view */
                <div
                  key={ev.id}
                  className="flex items-start gap-3 bg-secondary/20 border border-border rounded-md px-3 py-2.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline break-all"
                    >
                      {ev.title ?? ev.url}
                    </a>
                    <div className="flex items-center gap-2 flex-wrap">
                      {ev.platform && (
                        <span className="text-[10px] text-muted-foreground/60">
                          {ev.platform}
                        </span>
                      )}
                      {ev.title && (
                        <span className="text-[10px] text-muted-foreground/35 truncate max-w-[260px]">
                          {ev.url}
                        </span>
                      )}
                    </div>
                    {ev.summary && (
                      <p className="text-xs text-muted-foreground leading-snug mt-1">
                        {ev.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                    <button
                      onClick={() => startEditEvidence(ev)}
                      aria-label="Edit evidence"
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-muted-foreground border border-border rounded hover:text-foreground hover:bg-secondary/60 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemoveEvidence(ev.id)}
                      disabled={removingEvidenceId === ev.id}
                      aria-label="Delete evidence"
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-red-500/60 border border-red-500/15 rounded hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
                    >
                      {removingEvidenceId === ev.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      {removingEvidenceId === ev.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Research Notes ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Research Notes ({notes.length})
          </p>
          {!showNoteForm && !editingNoteId && (
            <button
              onClick={() => setShowNoteForm(true)}
              className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          )}
        </div>

        {/* Add note form */}
        {showNoteForm && (
          <NoteForm
            body={addNoteBody}
            noteType={addNoteType}
            error={addNoteError}
            isPending={isAddingNote}
            submitLabel="Add note"
            pendingLabel="Saving…"
            onBodyChange={setAddNoteBody}
            onTypeChange={setAddNoteType}
            onSubmit={handleAddNote}
            onCancel={resetAddNoteForm}
          />
        )}

        {/* Notes list */}
        {notes.length === 0 && !showNoteForm ? (
          <p className="text-xs text-muted-foreground/50 italic">
            No research notes yet.
          </p>
        ) : (
          <div className="space-y-2">
            {notes.map((note) =>
              editingNoteId === note.id ? (
                /* Inline edit form */
                <div key={note.id} className="bg-secondary/20 border border-primary/20 rounded-md p-3">
                  <NoteForm
                    body={editNoteBody}
                    noteType={editNoteType}
                    error={editNoteError}
                    isPending={isSavingNote}
                    submitLabel="Save changes"
                    pendingLabel="Saving…"
                    onBodyChange={setEditNoteBody}
                    onTypeChange={setEditNoteType}
                    onSubmit={handleSaveNote}
                    onCancel={cancelEditNote}
                  />
                </div>
              ) : (
                /* Read view */
                <div
                  key={note.id}
                  className="bg-secondary/20 border border-border rounded-md px-3 py-2.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded capitalize",
                          note.noteType === "status"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-blue-500/10 text-blue-400"
                        )}
                      >
                        {note.noteType}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50 font-mono">
                        {formatDate(note.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => startEditNote(note)}
                        aria-label="Edit note"
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-muted-foreground border border-border rounded hover:text-foreground hover:bg-secondary/60 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveNote(note.id)}
                        disabled={removingNoteId === note.id}
                        aria-label="Delete note"
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-red-500/60 border border-red-500/15 rounded hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
                      >
                        {removingNoteId === note.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        {removingNoteId === note.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                    {note.body}
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared sub-forms (kept local; not exported) ───────────────────────────────

function EvidenceForm({
  url, title, platform, summary, error, isPending,
  submitLabel, pendingLabel,
  onUrlChange, onTitleChange, onPlatformChange, onSummaryChange,
  onSubmit, onCancel,
}: {
  url: string; title: string; platform: string; summary: string;
  error: string | null; isPending: boolean;
  submitLabel: string; pendingLabel: string;
  onUrlChange: (v: string) => void;
  onTitleChange: (v: string) => void;
  onPlatformChange: (v: string) => void;
  onSummaryChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          URL <span className="text-red-400">*</span>
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://…"
          required
          disabled={isPending}
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Article or thread title"
            disabled={isPending}
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Platform</label>
          <input
            type="text"
            value={platform}
            onChange={(e) => onPlatformChange(e.target.value)}
            placeholder="e.g. Reddit, IH, X"
            disabled={isPending}
            className={inputCls}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Summary</label>
        <textarea
          value={summary}
          onChange={(e) => onSummaryChange(e.target.value)}
          placeholder="What pain or signal does this show?"
          rows={2}
          disabled={isPending}
          className={cn(inputCls, "resize-none")}
        />
      </div>
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-md hover:text-foreground hover:bg-secondary/50 transition-all disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !url.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-md font-medium transition-all disabled:opacity-60"
        >
          {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
          {isPending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

function NoteForm({
  body, noteType, error, isPending,
  submitLabel, pendingLabel,
  onBodyChange, onTypeChange, onSubmit, onCancel,
}: {
  body: string;
  noteType: "research" | "status";
  error: string | null;
  isPending: boolean;
  submitLabel: string;
  pendingLabel: string;
  onBodyChange: (v: string) => void;
  onTypeChange: (v: "research" | "status") => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex items-center gap-2">
        {(["research", "status"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTypeChange(t)}
            disabled={isPending}
            className={cn(
              "px-2.5 py-1 text-[10px] rounded-md border transition-all capitalize",
              noteType === t
                ? "bg-primary/15 border-primary/30 text-primary font-medium"
                : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Note <span className="text-red-400">*</span>
        </label>
        <textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="What did you learn or decide?"
          rows={3}
          required
          disabled={isPending}
          className={cn(inputCls, "resize-none")}
        />
      </div>
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-md hover:text-foreground hover:bg-secondary/50 transition-all disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !body.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-md font-medium transition-all disabled:opacity-60"
        >
          {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
          {isPending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
