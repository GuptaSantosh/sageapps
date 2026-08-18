import { PROJECTS } from "@/lib/mock-data";
import type { Project } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowRight, TrendingUp } from "lucide-react";

const STATUS_CONFIG = {
  live: { label: "Live", className: "bg-emerald-500/10 text-emerald-400 border-0" },
  "in-progress": { label: "In Progress", className: "bg-blue-500/10 text-blue-400 border-0" },
  planned: { label: "Planned", className: "bg-zinc-500/10 text-zinc-400 border-0" },
  paused: { label: "Paused", className: "bg-amber-500/10 text-amber-400 border-0" },
};

function ProjectCard({ project }: { project: Project }) {
  const { label, className } = STATUS_CONFIG[project.status];
  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4 hover:border-primary/20 transition-all duration-150">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{project.tagline}</p>
        </div>
        <Badge variant="outline" className={cn("flex-shrink-0 text-[10px] uppercase tracking-wide px-2", className)}>
          {label}
        </Badge>
      </div>

      {/* Key metric */}
      <div className="flex items-end gap-1.5">
        <span className="font-mono text-2xl font-semibold text-foreground tabular-nums leading-none">
          {project.keyMetric}
        </span>
        <span className="text-xs text-muted-foreground mb-0.5">{project.keyMetricLabel}</span>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Progress</span>
          <span className="font-mono text-[11px] text-muted-foreground">{project.progress}%</span>
        </div>
        <Progress
          value={project.progress}
          className="h-1 bg-secondary [&>div]:bg-primary"
        />
      </div>

      {/* Next milestone */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-secondary/40 rounded px-3 py-2">
        <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-primary" />
        <span className="leading-relaxed">{project.nextMilestone}</span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 bg-secondary rounded text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const live = PROJECTS.filter((p) => p.status === "live");
  const inProgress = PROJECTS.filter((p) => p.status === "in-progress");
  const planned = PROJECTS.filter((p) => p.status === "planned");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {PROJECTS.length} total &middot; {live.length} live &middot; {inProgress.length} in progress
        </p>
      </div>

      {/* Timeline summary */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-medium text-foreground">Portfolio at a Glance</h2>
        </div>
        <div className="flex gap-0 overflow-x-auto pb-2">
          {PROJECTS.map((p, i) => (
            <div
              key={p.id}
              className="flex flex-col items-center flex-shrink-0 min-w-[120px]"
            >
              <div className="flex items-center w-full">
                <div
                  className={cn(
                    "h-2 flex-1 rounded-full",
                    p.status === "live" && "bg-emerald-500",
                    p.status === "in-progress" && "bg-blue-500",
                    p.status === "planned" && "bg-zinc-600",
                    p.status === "paused" && "bg-amber-500",
                    i > 0 && "ml-1"
                  )}
                  style={{ opacity: 0.4 + (p.progress / 100) * 0.6 }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center leading-tight px-1">
                {p.name}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground/60">{p.progress}%</p>
            </div>
          ))}
        </div>
      </div>

      {live.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
            Live — {live.length}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {live.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>
      )}

      {inProgress.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
            In Progress — {inProgress.length}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {inProgress.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>
      )}

      {planned.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
            Planned — {planned.length}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {planned.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}
