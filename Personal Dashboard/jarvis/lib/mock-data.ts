/**
 * mock-data.ts — all static/mock data for Jarvis (private mode).
 *
 * DataState legend:
 *   'live'          → value derived from config/code, accurate as-of last edit
 *   'demo'          → illustrative placeholder — not from a live data source
 *   'not-connected' → slot for real data that isn't wired yet
 */
import type {
  Agent,
  Project,
  ActivityEvent,
  MetricCard,
  WinEntry,
  ChartDataPoint,
} from './types';

// ─── Agent registry ──────────────────────────────────────────────────────────
// 5 agents: MailSage · FinSage · TaxSage Analyst · Opportunity Radar · Content Pulse

export const AGENTS: Agent[] = [
  // ── 1. MailSage ──────────────────────────────────────────────────────────
  {
    id: 'mail-sage',
    name: 'MailSage',
    description: 'Summarises your Gmail inbox via Telegram. Delivers signal-rich email briefs filtered by your persona.',
    type: 'autonomous',
    triggerType: 'scheduled',
    status: 'idle',
    dataState: 'demo', // Real bot is live on the droplet; run history below is demo data
    lastRunAt: '2026-08-17T07:30:00Z',
    schedule: 'Daily at 7:00 AM & 7:00 PM IST',
    enabled: true,
    model: undefined,     // will be set to 'claude-sonnet-4-6' when wired from dashboard
    connectors: ['Gmail', 'Telegram'],
    systemPrompt: `You are MailSage, an email intelligence agent. Analyse the user's Gmail inbox and produce a structured brief with three sections: ACTION REQUIRED (emails needing a reply or decision), FYI (informational, no action needed), and NOISE (newsletters, promos). Use the user's signal profile to rank importance. Format output as numbered lists with bold sender names. Be concise — the user reads this on Telegram.`,
    inputParams: [],
    runHistory: [
      {
        id: 'run-ms-1',
        startedAt: '2026-08-17T07:30:00Z',
        completedAt: '2026-08-17T07:30:42Z',
        status: 'success',
        output: '[DEMO] 🔴 ACTION REQUIRED (2)\n1. *HDFC Bank* — Credit card statement due Aug 22\n2. *CA Vikram* — ITR filing confirmation needed\n\n🟡 FYI (4)\n1. *GitHub* — Dependabot alert on sageapps repo\n2. *Google Cloud* — Billing cycle closes Aug 20\n3. *NIC (IT Dept)* — AIS updated for Q1\n4. *Razorpay* — Settlement processed ₹12,400\n\n⚪ NOISE (11) — newsletters, promos, alerts',
      },
      {
        id: 'run-ms-2',
        startedAt: '2026-08-16T19:30:00Z',
        completedAt: '2026-08-16T19:30:38Z',
        status: 'success',
        output: '[DEMO] 🔴 ACTION REQUIRED (1)\n1. *IIM Alumni* — RSVP deadline Aug 18 for Bangalore chapter meetup\n\n🟡 FYI (6)\n1. *Vercel* — Build deployed successfully\n2. *DigitalOcean* — Droplet usage normal\n3. *Zerodha* — P&L statement for July\n4. *LinkedIn* — 3 connection requests pending\n5. *AWS* — Free tier usage 82%\n6. *Google Workspace* — Storage at 64%\n\n⚪ NOISE (8) — newsletters, promos',
      },
    ],
    pendingApprovals: [],
  },

  // ── 2. FinSage ────────────────────────────────────────────────────────────
  {
    id: 'fin-sage',
    name: 'FinSage',
    description: 'Personal finance intelligence. Analyses AIS/26AS data, flags discrepancies, and surfaces tax optimisation insights.',
    type: 'click-triggered',
    triggerType: 'manual',
    status: 'idle',
    dataState: 'demo',
    lastRunAt: '2026-08-15T14:22:00Z',
    connectors: ['Manual upload (AIS/Form 16)'],
    systemPrompt: `You are FinSage, a personal finance intelligence agent for an Indian founder. Your job is to analyse AIS (Annual Information Statement) data, identify discrepancies between reported income and what the user expects, flag potential tax issues early, and surface actionable insights. You understand Form 16, capital gains, Section 80C/80D/80CCD deductions, and the new vs old tax regime tradeoffs. Always give concrete numbers and next steps, not vague advice.`,
    inputParams: [
      {
        key: 'document_type',
        label: 'Document Type',
        type: 'select',
        options: ['AIS/26AS Analysis', 'Form 16 Review', 'Capital Gains Summary', 'Regime Comparison'],
        defaultValue: 'AIS/26AS Analysis',
      },
      {
        key: 'financial_year',
        label: 'Financial Year',
        type: 'select',
        options: ['FY 2025-26', 'FY 2024-25', 'FY 2023-24'],
        defaultValue: 'FY 2025-26',
      },
    ],
    runHistory: [
      {
        id: 'run-fs-1',
        startedAt: '2026-08-15T14:22:00Z',
        completedAt: '2026-08-15T14:22:28Z',
        status: 'success',
        params: { document_type: 'AIS/26AS Analysis', financial_year: 'FY 2025-26' },
        output: '[DEMO] **AIS Analysis — FY 2025-26 (Q1)**\n\nTotal income reported in AIS: ₹18,40,000\nExpected from records: ₹17,20,000\nDiscrepancy: ₹1,20,000 — likely Razorpay settlements not yet reconciled\n\n**Flags:**\n• TDS deducted ₹84,000 — verify Form 16A from all deductors\n• Crypto transactions (3) — ensure reported under Schedule VDA\n• Dividend income ₹12,400 from HDFC AMC — taxable, add to other income\n\n**Next steps:**\n1. Download Q1 26AS from TRACES by Aug 20\n2. Match Razorpay settlements with bank statement\n3. Raise query on ₹1.2L discrepancy with CA before advance tax deadline',
      },
    ],
  },

  // ── 3. TaxSage Analyst ────────────────────────────────────────────────────
  {
    id: 'tax-sage-analyst',
    name: 'TaxSage Analyst',
    description: 'Runs tax regime comparisons. Reads Form 16 data and produces old vs new regime breakdowns with an optimal recommendation.',
    type: 'click-triggered',
    triggerType: 'manual',
    status: 'idle',
    dataState: 'demo',
    lastRunAt: '2026-08-14T10:05:00Z',
    connectors: ['Manual input'],
    systemPrompt: `You are TaxSage, a tax optimisation agent for Indian salaried individuals and founders. Given salary components and deduction details, compute exact tax liability under both the Old Regime (with 80C, 80D, HRA, LTA deductions) and New Regime (flat slabs, no major deductions). Output a clear comparison table, identify the break-even deduction point, and give a definitive recommendation with reasoning. Always verify the 80CCD(2) NPS employer contribution is treated correctly (allowed in new regime).`,
    inputParams: [
      {
        key: 'gross_salary',
        label: 'Gross Annual Salary (₹)',
        type: 'number',
        placeholder: '2500000',
      },
      {
        key: 'regime',
        label: 'Compare Against',
        type: 'select',
        options: ['Both regimes', 'Old regime only', 'New regime only'],
        defaultValue: 'Both regimes',
      },
    ],
    runHistory: [
      {
        id: 'run-ts-1',
        startedAt: '2026-08-14T10:05:00Z',
        completedAt: '2026-08-14T10:05:19Z',
        status: 'success',
        params: { gross_salary: '2500000', regime: 'Both regimes' },
        output: '[DEMO] **Tax Regime Comparison — ₹25L Gross**\n\nOld Regime (with max deductions):\n• Taxable income after 80C+80D+HRA: ₹19,50,000\n• Tax liability: ₹3,82,500 + cess = **₹3,97,800**\n\nNew Regime:\n• Standard deduction ₹75,000 applied\n• Taxable income: ₹24,25,000\n• Tax liability: ₹4,10,625 + cess = **₹4,27,050**\n\n**Verdict: OLD REGIME saves ₹29,250**\nBreak-even: If total deductions < ₹2,10,000, switch to new regime.',
      },
    ],
  },

  // ── 4. Opportunity Radar ─────────────────────────────────────────────────
  {
    id: 'opportunity-radar',
    name: 'Opportunity Radar',
    description: 'Researches startup and solopreneur pain points from Reddit, Indie Hackers, Product Hunt, YouTube, X, Substack, and forums. Scores each opportunity across 10 dimensions and recommends Validate Now / Investigate / Watch / Ignore.',
    type: 'autonomous',
    triggerType: 'scheduled',
    status: 'idle',
    dataState: 'demo', // not yet connected to live sources; outputs are illustrative
    lastRunAt: '2026-08-17T06:00:00Z',
    schedule: 'Weekly on Monday at 8:00 AM IST',
    enabled: false,     // disabled until live source connectors are wired
    model: undefined,   // will be 'claude-sonnet-4-6' when real pipeline is built
    workspaceUrl: '/opportunities',
    connectors: [
      'Reddit (r/IndiaInvestments, r/personalfinanceindia, r/startups)',
      'Indie Hackers',
      'Product Hunt',
      'Twitter/X',
      'YouTube (comments)',
      'Substack (newsletters)',
    ],
    systemPrompt: `You are Opportunity Radar, a research agent that continuously monitors startup and solopreneur communities for genuine pain points and unmet needs. Your job is NOT to generate AI startup ideas — it is to surface problems that real people complain about repeatedly, and that they appear willing to pay to solve.

For each opportunity you find, score it across 10 dimensions (1–10):
1. Pain severity — how acutely do people feel this?
2. Frequency — how often does it recur?
3. Willingness to pay — evidence of existing spend or frustration with free alternatives
4. Founder fit — Santosh's edge: fintech, Indian market, AI tooling, distribution channels
5. Customer reach — ease of finding and reaching these users
6. Speed to validate — how quickly could a landing page + 10 interviews give signal?
7. Competition intensity — 10 = essentially open market, 1 = dominated by well-funded incumbents
8. Platform/frontier risk — 10 = no single dependency, 1 = one API change kills it
9. Defensibility — moats: data, network effects, brand, switching cost
10. Revenue potential — realistic ARR ceiling at founder-scale

Calculate an overall score. Write a 2–3 sentence "why this matters" thesis. Recommend one of: Validate Now / Investigate / Watch / Ignore. Always cite the source (platform + post/thread summary) for every pain point.

Distinguish hype ("everyone wants AI X") from genuine repeated complaints backed by actual user behaviour.`,
    inputParams: [
      {
        key: 'focus_area',
        label: 'Focus Area (optional)',
        type: 'select',
        options: ['All areas', 'Indian market only', 'Fintech & tax', 'Productivity & tools', 'Community & marketplaces'],
        defaultValue: 'All areas',
      },
      {
        key: 'min_score',
        label: 'Minimum overall score to include',
        type: 'select',
        options: ['4', '5', '6', '7', '8'],
        defaultValue: '5',
      },
    ],
    runHistory: [
      {
        id: 'run-or-1',
        startedAt: '2026-08-17T06:00:00Z',
        completedAt: '2026-08-17T06:03:12Z',
        status: 'success',
        params: { focus_area: 'All areas', min_score: '5' },
        output: '[DEMO] Opportunity Radar scan complete.\n\n4 opportunities scored above 5.0:\n• #1 Indian Freelancer Tax & Compliance Stack — 8.1 — Validate Now\n• #2 WhatsApp-Native Expense Tracker — 6.8 — Investigate\n• #3 AI Rent Agreement Generator (India) — 5.6 — Watch\n• #4 SaaS Pricing Calculator for Indian B2B — 4.2 — Ignore\n\nOpen the detail view and click Run for the full scored report with source citations.',
        sources: [
          { platform: 'Reddit', label: 'r/IndiaInvestments — "Freelancer GST filing is a nightmare" (847 upvotes)', observedAt: '2026-08-15' },
          { platform: 'Indie Hackers', label: 'Show IH: "Built a rent agreement tool, 3K signups in 2 weeks"', observedAt: '2026-08-10' },
          { platform: 'Product Hunt', label: 'PH Discussion: Indian SaaS pricing threads', observedAt: '2026-08-12' },
          { platform: 'Reddit', label: 'r/personalfinanceindia — Monthly expense tracker thread', observedAt: '2026-08-16' },
        ],
      },
    ],
    pendingApprovals: [],
  },

  // ── 5. Content Pulse ─────────────────────────────────────────────────────
  {
    id: 'content-agent',
    name: 'Content Pulse',
    description: 'Drafts LinkedIn posts, tweets, and product updates based on recent milestones and insights from your projects.',
    type: 'click-triggered',
    triggerType: 'manual',
    status: 'error',
    dataState: 'demo',
    lastRunAt: '2026-08-17T09:10:00Z',
    connectors: ['Manual topic input'],
    systemPrompt: `You are a content strategist and ghostwriter for a fintech founder building AI-first consumer tools in India. Write authentic, insight-rich posts that share learnings, product milestones, and founder observations. Avoid hype and buzzwords. Tone: direct, thoughtful, occasionally self-deprecating. Target audience: other founders, developers, and early adopters of AI tools in India.`,
    inputParams: [
      {
        key: 'platform',
        label: 'Platform',
        type: 'select',
        options: ['LinkedIn', 'Twitter/X', 'Product Hunt'],
        defaultValue: 'LinkedIn',
      },
      {
        key: 'topic',
        label: 'Topic / Milestone',
        type: 'text',
        placeholder: 'e.g. TaxSage hit 500 users this week',
      },
    ],
    runHistory: [
      {
        id: 'run-cp-1',
        startedAt: '2026-08-17T09:10:00Z',
        status: 'error',
        output: 'Error: Claude API rate limit reached. Retry in 60 seconds.',
      },
      {
        id: 'run-cp-2',
        startedAt: '2026-08-16T11:30:00Z',
        completedAt: '2026-08-16T11:30:35Z',
        status: 'success',
        params: { platform: 'LinkedIn', topic: 'Form 16 Analyser launch' },
        output: '[DEMO] Built a Form 16 Analyser over the weekend.\n\nNot because it was on the roadmap — but because a friend asked me to check his salary slip and I realised most people have no idea what their employer is deducting or why.\n\nThe tool reads Form 16 and tells you: what you\'re actually earning, whether NPS contributions are reported correctly (they often aren\'t), and whether you\'re in the right tax regime.\n\nIt\'s live at sageapps.in/taxsage. Free. No signup.\n\nWeird how the most used tools come from the simplest frustrations.',
      },
    ],
  },
];

// ─── Projects ─────────────────────────────────────────────────────────────────
// No RWA project. JMD Gardens work is personal/community, not a product.

export const PROJECTS: Project[] = [
  {
    id: 'taxsage',
    name: 'TaxSage',
    tagline: 'Old vs new regime calculator + Form 16 analyser',
    status: 'live',
    keyMetric: '3,800',
    keyMetricLabel: 'Monthly active users',
    nextMilestone: 'Capital gains module (LTCG/STCG for equity)',
    progress: 72,
    tags: ['Tax', 'SaaS', 'India'],
    startedAt: '2025-09-15',
  },
  {
    id: 'finsage',
    name: 'FinSage',
    tagline: 'AIS & tax intelligence for Indian founders',
    status: 'live',
    keyMetric: '1,240',
    keyMetricLabel: 'Tool opens this month',
    nextMilestone: 'Portfolio tracker with XIRR calculation',
    progress: 65,
    tags: ['Tax', 'Finance', 'AI'],
    startedAt: '2025-11-01',
  },
  {
    id: 'mailsage',
    name: 'MailSage',
    tagline: 'AI email intelligence via Telegram',
    status: 'live',
    keyMetric: '48',
    keyMetricLabel: 'Active subscribers',
    nextMilestone: 'Multi-account Gmail support',
    progress: 55,
    tags: ['Email', 'Telegram', 'AI'],
    startedAt: '2025-12-01',
  },
  {
    id: 'nachle-ai',
    name: 'NachleAI',
    tagline: 'Dance event discovery and community platform',
    status: 'in-progress',
    keyMetric: '—',
    keyMetricLabel: 'Pre-launch',
    nextMilestone: 'Launch event aggregator MVP for Bangalore',
    progress: 25,
    tags: ['Community', 'Dance', 'Marketplace'],
    startedAt: '2026-06-01',
  },
  {
    id: 'jarvis',
    name: 'Jarvis Dashboard',
    tagline: 'Private founder command center (this app)',
    status: 'in-progress',
    keyMetric: 'v1',
    keyMetricLabel: 'Current version',
    nextMilestone: 'Wire real agent API calls',
    progress: 35,
    tags: ['Internal', 'Tooling', 'AI'],
    startedAt: '2026-08-17',
  },
];

// ─── Activity feed ─────────────────────────────────────────────────────────────
// All events below are DEMO DATA — timestamps and details are illustrative.
// This feed will be replaced by real event log once agent telemetry is wired.

export const ACTIVITY: ActivityEvent[] = [
  {
    id: 'evt-1',
    type: 'agent_run',
    title: 'MailSage morning brief delivered',
    description: '14 emails processed · 2 action items surfaced',
    timestamp: '2026-08-17T07:30:42Z',
    agentId: 'mail-sage',
    dataState: 'demo',
  },
  {
    id: 'evt-2',
    type: 'project_update',
    title: 'TaxSage — 12 Form 16 analyses run overnight',
    description: 'Peak usage 11 PM–1 AM. 0 errors.',
    timestamp: '2026-08-17T01:15:00Z',
    dataState: 'demo',
  },
  {
    id: 'evt-3',
    type: 'agent_run',
    title: 'Opportunity Radar weekly scan complete',
    description: '4 opportunities scored · #1 Freelancer Tax Stack rated 8.1',
    timestamp: '2026-08-17T06:03:12Z',
    agentId: 'opportunity-radar',
    dataState: 'demo',
  },
  {
    id: 'evt-4',
    type: 'agent_run',
    title: 'FinSage AIS analysis completed',
    description: 'FY25-26 Q1 · ₹1.2L discrepancy flagged',
    timestamp: '2026-08-15T14:22:28Z',
    agentId: 'fin-sage',
    dataState: 'demo',
  },
  {
    id: 'evt-5',
    type: 'agent_run',
    title: 'Content Pulse — LinkedIn post drafted',
    description: 'Form 16 Analyser launch post · 347 words',
    timestamp: '2026-08-16T11:30:35Z',
    agentId: 'content-agent',
    dataState: 'demo',
  },
  {
    id: 'evt-6',
    type: 'system',
    title: 'MailSage evening brief delivered',
    description: '9 emails processed · 1 RSVP deadline flagged',
    timestamp: '2026-08-16T19:30:38Z',
    agentId: 'mail-sage',
    dataState: 'demo',
  },
  {
    id: 'evt-7',
    type: 'agent_run',
    title: 'Content Pulse — Error',
    description: 'Claude API rate limit hit. Auto-retry pending.',
    timestamp: '2026-08-17T09:10:00Z',
    agentId: 'content-agent',
    dataState: 'demo',
  },
  {
    id: 'evt-8',
    type: 'project_update',
    title: 'FinSage deployed — email gate added',
    description: 'Same pattern as AIS Scanner. Commit 9937285',
    timestamp: '2026-08-17T00:00:00Z',
    dataState: 'demo',
  },
];

// ─── Overview metrics ──────────────────────────────────────────────────────────
// DataState is set per metric:
//   'live'          → derived from code/config, accurate
//   'demo'          → illustrative placeholder
//   'not-connected' → will show real data once wired

export const OVERVIEW_METRICS: MetricCard[] = [
  {
    id: 'agents-configured',
    label: 'Agents Configured',
    value: AGENTS.length,
    delta: `${AGENTS.filter((a) => a.enabled !== false).length} enabled`,
    deltaType: 'neutral',
    dataState: 'live', // count is always accurate from the config above
  },
  {
    id: 'projects-live',
    label: 'Projects Live',
    value: PROJECTS.filter((p) => p.status === 'live').length,
    delta: `${PROJECTS.filter((p) => p.status === 'in-progress').length} in progress`,
    deltaType: 'neutral',
    dataState: 'live', // count is always accurate from the config above
  },
  {
    id: 'pending-approvals',
    label: 'Pending Approvals',
    value: AGENTS.reduce((s, a) => s + (a.pendingApprovals?.length ?? 0), 0),
    delta: 'Across all agents',
    deltaType: 'neutral',
    dataState: 'live', // derived from agent data above
  },
  {
    id: 'runs-today',
    label: 'Runs Today',
    value: '—',
    delta: 'Not connected',
    deltaType: 'neutral',
    dataState: 'not-connected', // requires real agent telemetry
  },
  {
    id: 'uptime',
    label: 'System Uptime',
    value: '—',
    delta: 'Not monitored',
    deltaType: 'neutral',
    dataState: 'not-connected', // requires real health check endpoint
  },
  {
    id: 'time-saved',
    label: 'Time Saved (est.)',
    value: '4.2h',
    delta: 'Demo estimate',
    deltaType: 'neutral',
    dataState: 'demo', // illustrative; real value needs actual run logs
  },
];

// ─── Chart data ────────────────────────────────────────────────────────────────
// Entirely demo data — illustrates what the chart will look like once real
// agent telemetry is wired. Labelled explicitly in the Insights page.

export const CHART_DATA: ChartDataPoint[] = [
  { date: 'Aug 11', agentRuns: 3, manualTasks: 14, timeSavedMinutes: 35 },
  { date: 'Aug 12', agentRuns: 5, manualTasks: 12, timeSavedMinutes: 55 },
  { date: 'Aug 13', agentRuns: 4, manualTasks: 10, timeSavedMinutes: 45 },
  { date: 'Aug 14', agentRuns: 6, manualTasks: 9, timeSavedMinutes: 70 },
  { date: 'Aug 15', agentRuns: 8, manualTasks: 8, timeSavedMinutes: 90 },
  { date: 'Aug 16', agentRuns: 7, manualTasks: 7, timeSavedMinutes: 80 },
  { date: 'Aug 17', agentRuns: 4, manualTasks: 5, timeSavedMinutes: 50 },
];

// ─── Wins log ──────────────────────────────────────────────────────────────────
// Manually maintained. Kept as a real journal, not agent telemetry.
// Remove the RWA win; keep legitimate product milestones.

export const WINS: WinEntry[] = [
  {
    id: 'win-1',
    date: '2026-08-17',
    title: 'Form 16 Analyser live with email gate',
    description: 'Shipped email capture on Form 16 tool. Same pattern validated from AIS Scanner. Growing top-of-funnel for TaxSage.',
    impact: 'high',
  },
  {
    id: 'win-2',
    date: '2026-08-14',
    title: 'TaxSage crossed 3,800 MAU',
    description: 'Organic growth, zero ad spend. Tax season tailwind still strong even in Aug.',
    impact: 'high',
  },
  {
    id: 'win-3',
    date: '2026-08-10',
    title: 'MailSage onboarded 10 new users in one week',
    description: 'Word-of-mouth from IIM alumni group. No announcement made.',
    impact: 'medium',
  },
  {
    id: 'win-4',
    date: '2026-07-28',
    title: 'NachleAI concept validated with 8 dancers',
    description: 'All 8 said they\'d use an event aggregator. 3 offered to beta test.',
    impact: 'medium',
  },
  {
    id: 'win-5',
    date: '2026-07-15',
    title: '80CCD(2) bug fixed — 40+ users benefited',
    description: 'Portal was mishandling NPS employer contributions in new regime. Fixed calculation saved users ₹8K–₹40K in misreported tax.',
    impact: 'high',
  },
];
