/**
 * DataStateBadge — reusable indicator for data connectivity state.
 *
 * Use this anywhere data might be live, mocked, or not yet wired:
 *   <DataStateBadge state="live" />         → green dot  · Live
 *   <DataStateBadge state="demo" />         → amber dot  · Demo
 *   <DataStateBadge state="not-connected" /> → grey dot  · Not connected
 */
import { cn } from "@/lib/utils";
import type { DataState } from "@/lib/types";

const CONFIG: Record<DataState, { dot: string; label: string; text: string }> = {
  live: {
    dot: "bg-emerald-400",
    label: "Live",
    text: "text-emerald-400",
  },
  demo: {
    dot: "bg-amber-400",
    label: "Demo",
    text: "text-amber-400",
  },
  "not-connected": {
    dot: "bg-zinc-600",
    label: "Not connected",
    text: "text-zinc-500",
  },
};

interface DataStateBadgeProps {
  state: DataState;
  className?: string;
  showLabel?: boolean; // default true
}

export function DataStateBadge({ state, className, showLabel = true }: DataStateBadgeProps) {
  const { dot, label, text } = CONFIG[state];
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dot)} />
      {showLabel && (
        <span className={cn("font-mono text-[10px] uppercase tracking-wide", text)}>
          {label}
        </span>
      )}
    </span>
  );
}
