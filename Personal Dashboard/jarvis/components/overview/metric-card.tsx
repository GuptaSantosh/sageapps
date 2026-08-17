import type { MetricCard } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DataStateBadge } from "@/components/ui/data-state-badge";

interface MetricCardProps {
  metric: MetricCard;
}

export function MetricCardComponent({ metric }: MetricCardProps) {
  const isDim = metric.dataState === 'not-connected';
  return (
    <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium leading-tight">
          {metric.label}
        </p>
        <DataStateBadge state={metric.dataState} showLabel={false} />
      </div>

      <div className="flex items-end gap-2">
        <span
          className={cn(
            "font-mono text-3xl font-semibold tabular-nums leading-none",
            isDim ? "text-muted-foreground/40" : "text-foreground"
          )}
        >
          {metric.value}
        </span>
        {metric.unit && (
          <span className="text-sm text-muted-foreground mb-0.5">{metric.unit}</span>
        )}
      </div>

      {metric.delta && (
        <p
          className={cn(
            "text-xs",
            metric.deltaType === "positive" && !isDim && "text-emerald-400",
            metric.deltaType === "negative" && "text-red-400",
            (metric.deltaType === "neutral" || isDim) && "text-muted-foreground"
          )}
        >
          {metric.delta}
        </p>
      )}
    </div>
  );
}
