"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, User, Bell, Bot, Shield } from "lucide-react";

function MaskedInput({ label, value }: { label: string; value: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type={visible ? "text" : "password"}
          value={value}
          readOnly
          className="flex-1 bg-input border border-border rounded px-3 py-2 text-sm text-foreground font-mono focus:outline-none"
        />
        <button
          onClick={() => setVisible((v) => !v)}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  defaultChecked = false,
}: {
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={setChecked}
        className="data-[state=checked]:bg-primary flex-shrink-0"
      />
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure Jarvis to your workflow</p>
      </div>

      {/* Profile */}
      <Section icon={User} title="Profile">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary text-lg font-semibold">
            SG
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Santosh Gupta</p>
            <p className="text-xs text-muted-foreground">18yr fintech &middot; S&P &middot; NIT &middot; IIM</p>
          </div>
        </div>
        <Separator className="my-4 bg-border" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Name</label>
            <input
              defaultValue="Santosh Gupta"
              readOnly
              className="w-full bg-input border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Timezone</label>
            <input
              defaultValue="Asia/Kolkata (IST)"
              readOnly
              className="w-full bg-input border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none font-mono"
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <label className="text-xs text-muted-foreground">Telegram Username</label>
            <input
              defaultValue="@santoshgupta"
              readOnly
              className="w-full bg-input border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none font-mono"
            />
          </div>
        </div>
      </Section>

      {/* Agent API Keys */}
      <Section icon={Bot} title="Agent Configuration">
        <p className="text-xs text-muted-foreground mb-4">
          API keys used by agents. Stored in environment variables — not transmitted from this UI.
        </p>
        <div className="space-y-4">
          <MaskedInput label="Anthropic API Key" value="sk-ant-api03-••••••••••••••••••••••••••••••••••••••••••••••••••••••" />
          <MaskedInput label="Gmail OAuth Client ID" value="••••••••••.apps.googleusercontent.com" />
          <MaskedInput label="Telegram Bot Token" value="••••••••••:AAH••••••••••••••••••••••••••" />
          <MaskedInput label="Razorpay Webhook Secret" value="rzp_live_••••••••••••••••" />
        </div>
        <div className="mt-4 px-3 py-2.5 bg-secondary/40 rounded text-xs text-muted-foreground">
          To update keys, modify <code className="font-mono text-foreground/60">.env.local</code> and restart the dev server.
        </div>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Notifications">
        <div className="divide-y divide-border">
          <ToggleRow
            label="Agent run errors"
            description="Alert when an agent fails or encounters an error"
            defaultChecked={true}
          />
          <ToggleRow
            label="Pending approvals"
            description="Notify when autonomous agents need your sign-off"
            defaultChecked={true}
          />
          <ToggleRow
            label="Daily summary"
            description="Morning digest of overnight agent activity"
            defaultChecked={true}
          />
          <ToggleRow
            label="Project milestone alerts"
            description="Notify when a project milestone is reached"
            defaultChecked={false}
          />
          <ToggleRow
            label="Weekly insights report"
            description="Sunday summary of automation trends"
            defaultChecked={false}
          />
        </div>
      </Section>

      {/* Privacy */}
      <Section icon={Shield} title="Privacy & Access">
        <div className="divide-y divide-border">
          <ToggleRow
            label="Private dashboard"
            description="Dashboard is only accessible locally — no public URL"
            defaultChecked={true}
          />
          <ToggleRow
            label="Log agent outputs"
            description="Store agent run outputs in run history"
            defaultChecked={true}
          />
          <ToggleRow
            label="Analytics (local only)"
            description="Track usage patterns for insights page — stored locally"
            defaultChecked={true}
          />
        </div>
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">
            Version <span className="font-mono text-foreground/60">v1.0.0</span> &middot; No external telemetry.
          </p>
        </div>
      </Section>
    </div>
  );
}
