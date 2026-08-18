"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Bot,
  FolderKanban,
  BarChart3,
  Settings,
  Zap,
  AlertCircle,
  Target,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AGENTS } from "@/lib/mock-data";
import { OPPORTUNITIES } from "@/lib/opportunity-data";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/opportunities", label: "Opportunity Radar", icon: Target },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const pendingApprovals = AGENTS.filter(
    (a) => a.pendingApprovals && a.pendingApprovals.length > 0
  ).reduce((sum, a) => sum + (a.pendingApprovals?.length ?? 0), 0);

  const errorAgents = AGENTS.filter((a) => a.status === "error").length;
  const validateNowCount = OPPORTUNITIES.filter((o) => o.status === "validate-now").length;

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-sidebar border-r border-sidebar-border flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground tracking-tight">Jarvis</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Command Center</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const showApprovalBadge = href === "/agents" && pendingApprovals > 0;
          const showErrorBadge = href === "/agents" && errorAgents > 0 && !showApprovalBadge;
          const showRadarBadge = href === "/opportunities" && validateNowCount > 0;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-100",
                active
                  ? "bg-sidebar-accent text-foreground font-medium"
                  : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {showApprovalBadge && (
                <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[10px] flex items-center justify-center font-mono font-semibold">
                  {pendingApprovals}
                </span>
              )}
              {showErrorBadge && (
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              )}
              {showRadarBadge && (
                <span className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-400 text-[10px] flex items-center justify-center font-mono font-semibold">
                  {validateNowCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer — owner identity + sign out */}
      <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">
            SG
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">Santosh Gupta</p>
            <p className="text-[10px] text-muted-foreground truncate">Founder</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-all duration-100"
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
