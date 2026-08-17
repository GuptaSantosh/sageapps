import { OVERVIEW_METRICS, ACTIVITY } from "@/lib/mock-data";
import { MetricCardComponent } from "@/components/overview/metric-card";
import { ActivityFeed } from "@/components/overview/activity-feed";
import { QuickLaunch } from "@/components/overview/quick-launch";
import { DataStateBadge } from "@/components/ui/data-state-badge";
import { CommandPanel } from "@/components/jarvis/command-panel";

export default function OverviewPage() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground font-mono tabular-nums">
          {now.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <h1 className="text-2xl font-semibold text-foreground mt-1">
          {greeting}, Santosh.
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s your command center overview.
        </p>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {OVERVIEW_METRICS.map((metric) => (
          <MetricCardComponent key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Jarvis command interface */}
      <CommandPanel />

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        {/* Activity feed — demo data banner */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Recent Activity</h2>
            <DataStateBadge state="demo" />
          </div>
          <div className="px-5 py-1">
            <ActivityFeed events={ACTIVITY} />
          </div>
        </div>

        {/* Quick launch + services */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-medium text-foreground">Quick Launch</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Run an agent instantly</p>
            </div>
            <div className="px-5 py-5">
              <QuickLaunch />
            </div>
          </div>

          {/* Services — honest not-connected state */}
          <div className="bg-card border border-border rounded-lg px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Services</p>
              <DataStateBadge state="not-connected" />
            </div>
            <div className="space-y-2.5">
              {[
                { label: "MailSage Bot (Droplet)" },
                { label: "TaxSage API (Droplet)" },
                { label: "FinSage" },
                { label: "GitHub Pages (static)" },
              ].map(({ label }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="font-mono text-[11px] text-muted-foreground/50">not monitored</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/40 mt-3 leading-relaxed">
              Real health checks not yet wired. Add a /api/health endpoint to enable live status.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
