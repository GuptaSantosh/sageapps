import type { ActivityEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Bot, CheckCircle2, XCircle, FolderKanban, Terminal } from "lucide-react";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const EVENT_ICONS = {
  agent_run: Bot,
  agent_approved: CheckCircle2,
  agent_rejected: XCircle,
  project_update: FolderKanban,
  system: Terminal,
};

const EVENT_COLORS: Record<ActivityEvent["type"], string> = {
  agent_run: "text-blue-400",
  agent_approved: "text-emerald-400",
  agent_rejected: "text-red-400",
  project_update: "text-amber-400",
  system: "text-muted-foreground",
};

interface ActivityFeedProps {
  events: ActivityEvent[];
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const Icon = EVENT_ICONS[event.type];
        const color = EVENT_COLORS[event.type];
        return (
          <div
            key={event.id}
            className={cn(
              "flex items-start gap-4 py-3.5",
              i < events.length - 1 && "border-b border-border"
            )}
          >
            <div className={cn("mt-0.5 flex-shrink-0", color)}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium leading-tight">
                {event.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                {event.description}
              </p>
            </div>
            <span className="font-data text-[11px] text-muted-foreground flex-shrink-0 mt-0.5 tabular-nums">
              {timeAgo(event.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
