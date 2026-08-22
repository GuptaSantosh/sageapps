"use client";

import { useTransition, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createOpportunityAction,
  updateOpportunityFieldsAction,
} from "@/app/(private)/opportunities/actions";

// ── Props ─────────────────────────────────────────────────────────────────────

interface BaseProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface CreateProps extends BaseProps {
  mode: "create";
  opportunityId?: never;
  initialValues?: never;
}

interface EditProps extends BaseProps {
  mode: "edit";
  opportunityId: string;
  initialValues: {
    title: string;
    problemStatement: string;
    targetCustomer: string;
    customerType: string;
    tags: string[];
  };
}

type OpportunityFormProps = CreateProps | EditProps;

// ── Component ─────────────────────────────────────────────────────────────────

export function OpportunityForm({
  mode,
  opportunityId,
  initialValues,
  onSuccess,
  onCancel,
}: OpportunityFormProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [problemStatement, setProblemStatement] = useState(
    initialValues?.problemStatement ?? ""
  );
  const [targetCustomer, setTargetCustomer] = useState(
    initialValues?.targetCustomer ?? ""
  );
  const [customerType, setCustomerType] = useState(
    initialValues?.customerType ?? ""
  );
  const [discoveredAt, setDiscoveredAt] = useState(today);
  const [tagsInput, setTagsInput] = useState(
    (initialValues?.tags ?? []).join(", ")
  );

  function parseTags(s: string): string[] {
    return s
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const tags = parseTags(tagsInput);
      if (mode === "create") {
        const result = await createOpportunityAction({
          title: title.trim(),
          problemStatement: problemStatement.trim(),
          targetCustomer: targetCustomer.trim(),
          customerType: customerType.trim(),
          discoveredAt,
          tags,
        });
        if (result.ok) {
          onSuccess();
        } else {
          setError(result.error);
        }
      } else {
        const result = await updateOpportunityFieldsAction(opportunityId, {
          title: title.trim(),
          problemStatement: problemStatement.trim(),
          targetCustomer: targetCustomer.trim(),
          customerType: customerType.trim(),
          tags,
        });
        if (result.ok) {
          onSuccess();
        } else {
          setError(result.error);
        }
      }
    });
  }

  const inputCls =
    "w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Indian Freelancer Tax Stack"
            required
            disabled={isPending}
            className={inputCls}
          />
        </div>

        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Problem statement <span className="text-red-400">*</span>
          </label>
          <textarea
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            placeholder="1–2 sentences describing the core problem"
            rows={3}
            required
            disabled={isPending}
            className={cn(inputCls, "resize-none")}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Target customer
          </label>
          <input
            type="text"
            value={targetCustomer}
            onChange={(e) => setTargetCustomer(e.target.value)}
            placeholder="e.g. Indian freelancers earning ₹5–50L/yr"
            disabled={isPending}
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Customer type
          </label>
          <input
            type="text"
            value={customerType}
            onChange={(e) => setCustomerType(e.target.value)}
            placeholder="e.g. Indian Freelancer"
            disabled={isPending}
            className={inputCls}
          />
        </div>

        {mode === "create" && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Discovered on <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={discoveredAt}
              onChange={(e) => setDiscoveredAt(e.target.value)}
              required
              disabled={isPending}
              className={cn(inputCls, "cursor-pointer")}
            />
          </div>
        )}

        <div
          className={cn(
            "space-y-1.5",
            mode === "create" ? "" : "col-span-2"
          )}
        >
          <label className="text-xs font-medium text-muted-foreground">
            Tags{" "}
            <span className="font-normal text-muted-foreground/50">
              (comma-separated)
            </span>
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. Tax, India, SaaS"
            disabled={isPending}
            className={inputCls}
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 justify-end pt-1">
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
          disabled={isPending || !title.trim() || !problemStatement.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-md font-medium transition-all disabled:opacity-60"
        >
          {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
          {isPending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
            ? "Create opportunity"
            : "Save changes"}
        </button>
      </div>
    </form>
  );
}
