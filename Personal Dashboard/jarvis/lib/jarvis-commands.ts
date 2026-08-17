/**
 * Jarvis command routing — mock implementation.
 *
 * Pattern-matches natural language queries to agents and returns structured
 * mock responses. No LLM. No external API. All output is clearly labelled
 * [SIMULATED]. Replace resolveCommand() with a real Claude API call when ready.
 */

export interface DelegationStep {
  label: string;
  delayMs: number; // cumulative ms before this step appears
}

export interface CommandResult {
  agentId: string;       // which agent handled it (for activity trace colouring)
  agentName: string;     // display name
  steps: DelegationStep[];
  response: string;      // pre-formatted text output
  isSimulated: true;     // always true for mock; remove when real
  workspaceLink?: string; // optional: link to a workspace page for deeper context
}

// ─── Handlers ───────────────────────────────────────────────────────────────

type Handler = {
  test: (q: string) => boolean;
  handle: (q: string) => CommandResult;
};

const HANDLERS: Handler[] = [
  // ── Approval queue ────────────────────────────────────────────────────────
  {
    test: (q) => /approv|pending|sign.?off|review|queue/i.test(q),
    handle: () => ({
      agentId: 'approval-queue',
      agentName: 'Approval Queue',
      steps: [
        { label: 'Checking approval queues across all agents', delayMs: 350 },
        { label: '5 agents scanned', delayMs: 900 },
        { label: 'Result ready', delayMs: 1300 },
      ],
      response: `Approval Queue  [SIMULATED]\n\n0 items pending across 5 agents.\n\n  MailSage        — no pending actions\n  FinSage         — no pending actions\n  TaxSage         — no pending actions\n  Opp. Radar      — no pending actions\n  Content Pulse   — error state (rate limit)\n\nAll clear. Live approval flow activates once agents are wired.`,
      isSimulated: true,
    }),
  },

  // ── Opportunity Radar — score filter ─────────────────────────────────────
  {
    test: (q) =>
      /opportunit/i.test(q) && /above|over|scor|8|9|high/i.test(q),
    handle: () => ({
      agentId: 'opportunity-radar',
      agentName: 'Opportunity Radar',
      steps: [
        { label: 'Delegating to Opportunity Radar', delayMs: 350 },
        { label: 'Filtering scored opportunities by threshold', delayMs: 850 },
        { label: 'Result ready', delayMs: 1300 },
      ],
      response: `Opportunities Above 8.0  [SIMULATED]\n\n2 opportunities found:\n\n  #1  Indian Freelancer Tax & Compliance Stack — 8.1 / 10\n      Pain: 8 · WTP: 6 · Founder fit: 9\n      Status: Validating — 3 of 5 conversations done\n      → Open Opportunity Radar workspace for full detail\n\n  #2  AI Product Launch Readiness Review — 7.8 / 10\n      Pain: 8 · WTP: 7 · Founder fit: 8\n      Status: Validate Now — no conversations started\n\nView all 7 opportunities at /opportunities`,
      isSimulated: true,
      workspaceLink: '/opportunities',
    }),
  },

  // ── Opportunity Radar — general scan ─────────────────────────────────────
  {
    test: (q) =>
      /opportunit|radar|scan|startup|pain.?point|idea/i.test(q),
    handle: () => ({
      agentId: 'opportunity-radar',
      agentName: 'Opportunity Radar',
      steps: [
        { label: 'Delegating to Opportunity Radar', delayMs: 350 },
        { label: 'Simulating source scan — Reddit, IH, Product Hunt, Twitter/X', delayMs: 900 },
        { label: 'Scoring 7 opportunities against 10-dimension rubric', delayMs: 1900 },
        { label: 'Brief compiled', delayMs: 2700 },
      ],
      response: `Opportunity Radar — Demo Scan  [SIMULATED]\n\n7 opportunities in workspace:\n\n  8.1 / 10   Indian Freelancer Tax Stack         → Validating\n  7.8 / 10   AI Product Launch Review            → Validate Now\n  7.4 / 10   AI Agent Audit Trail Layer          → Investigating\n  7.0 / 10   D2C Revenue Reconciliation          → Investigating\n  6.3 / 10   DPDP Compliance Documentation       → Watch\n  4.8 / 10   ROC/MCA Filing Assistant            → Rejected\n  4.6 / 10   WhatsApp Chatbot for CAs            → Rejected\n\nOpen /opportunities for scorecards, evidence, and validation plans.`,
      isSimulated: true,
      workspaceLink: '/opportunities',
    }),
  },

  // ── FinSage ───────────────────────────────────────────────────────────────
  {
    test: (q) =>
      /fin.?sage|ais|26as|income.?tax|discrepan|itr|form.?16|capital.?gain/i.test(q),
    handle: () => ({
      agentId: 'fin-sage',
      agentName: 'FinSage',
      steps: [
        { label: 'Delegating to FinSage', delayMs: 350 },
        { label: 'Simulating AIS/26AS analysis for FY 2025-26', delayMs: 950 },
        { label: 'Flagging discrepancies', delayMs: 1700 },
        { label: 'Analysis ready', delayMs: 2300 },
      ],
      response: `FinSage — AIS Analysis  [SIMULATED]\n\nFY 2025-26 Q1 snapshot:\n\n  AIS reported income    ₹18,40,000\n  Expected from records  ₹17,20,000\n  Unexplained gap         ₹1,20,000  ← likely Razorpay settlements\n\nFlags:\n  • TDS deducted ₹84,000 — verify Form 16A from all deductors\n  • 3 crypto transactions — report under Schedule VDA\n  • Dividend income ₹12,400 (HDFC AMC) — taxable, add to other income\n\nNext: Download Q1 26AS from TRACES. Match against bank statement.`,
      isSimulated: true,
    }),
  },

  // ── TaxSage ───────────────────────────────────────────────────────────────
  {
    test: (q) =>
      /tax.?sage|regime|old.?vs.?new|new.?vs.?old|form.?16|80[cd]/i.test(q),
    handle: () => ({
      agentId: 'tax-sage-analyst',
      agentName: 'TaxSage Analyst',
      steps: [
        { label: 'Delegating to TaxSage Analyst', delayMs: 350 },
        { label: 'Running old vs new regime comparison at ₹25L', delayMs: 1000 },
        { label: 'Result ready', delayMs: 1700 },
      ],
      response: `TaxSage — Regime Comparison  [SIMULATED]\n\nAt ₹25L gross salary:\n\n  Old Regime   ₹3,97,800   (80C + 80D + HRA deductions)\n  New Regime   ₹4,27,050   (standard deduction only)\n\n  Verdict: OLD REGIME saves ₹29,250\n\n  Break-even: Deductions below ₹2,10,000 → switch to new regime.\n\n  ⚠ 80CCD(2) NPS employer contribution is mishandled on\n    many portals. Verify your employer's entry before filing.`,
      isSimulated: true,
    }),
  },

  // ── MailSage / email ──────────────────────────────────────────────────────
  {
    test: (q) =>
      /mail.?sage|email|inbox|gmail|brief|unread|messages/i.test(q),
    handle: () => ({
      agentId: 'mail-sage',
      agentName: 'MailSage',
      steps: [
        { label: 'Delegating to MailSage', delayMs: 350 },
        { label: 'Simulating Gmail fetch — last 24 hours', delayMs: 950 },
        { label: 'Classifying by signal profile', delayMs: 1700 },
        { label: 'Brief ready', delayMs: 2400 },
      ],
      response: `MailSage Brief  [SIMULATED]\n\n🔴 ACTION REQUIRED (2)\n  1. HDFC Bank     — Credit card statement due in 5 days\n  2. CA Vikram     — ITR filing confirmation needed\n\n🟡 FYI (4)\n  1. GitHub        — 2 Dependabot alerts on sageapps\n  2. DigitalOcean  — Monthly invoice ready\n  3. Zerodha       — Contract note for recent trade\n  4. Google        — Workspace storage at 64%\n\n⚪ NOISE (7) — newsletters, promos, automated alerts`,
      isSimulated: true,
    }),
  },

  // ── Content Pulse ─────────────────────────────────────────────────────────
  {
    test: (q) =>
      /content|draft|post|linkedin|tweet|twitter|write|publish/i.test(q),
    handle: () => ({
      agentId: 'content-agent',
      agentName: 'Content Pulse',
      steps: [
        { label: 'Delegating to Content Pulse', delayMs: 350 },
        { label: '⚠ Agent is in error state (Claude API rate limit)', delayMs: 800 },
        { label: 'Returning last successful draft', delayMs: 1300 },
      ],
      response: `Content Pulse — Last Draft  [SIMULATED]\n\n⚠ Agent currently in error state.\n  Last successful run: Aug 16 at 11:30 AM.\n\nLinkedIn · Form 16 Analyser launch:\n\n  "Built a Form 16 Analyser over the weekend. Not because\n   it was on the roadmap — but because a friend asked me\n   to check his salary slip and I realised most people have\n   no idea what their employer is deducting or why."\n\nFull draft: Agents › Content Pulse › History.`,
      isSimulated: true,
    }),
  },

  // ── Today's summary ───────────────────────────────────────────────────────
  {
    test: (q) =>
      /today|this session|what.*(did|happened|ran)|summarize|summary|activity/i.test(q),
    handle: () => ({
      agentId: 'session',
      agentName: 'Session Log',
      steps: [
        { label: 'Reading session activity log', delayMs: 350 },
        { label: 'Scanning agent run history', delayMs: 850 },
        { label: 'Summary compiled', delayMs: 1300 },
      ],
      response: `Today's Activity  [SIMULATED]\n\n  Agents active       MailSage (×2), Opportunity Radar (×1)\n  Events logged       8  (all demo data — telemetry not yet live)\n  Pending approvals   0\n  Projects            3 live · 2 in progress\n\nNotable:\n  • Content Pulse is in error — Claude API rate limit hit\n  • TaxSage peak usage was 11 PM–1 AM\n  • No items waiting for your approval\n\nActivity feed shows real events once agent telemetry is wired.`,
      isSimulated: true,
    }),
  },

  // ── Weekly focus ──────────────────────────────────────────────────────────
  {
    test: (q) =>
      /focus|week|priority|should.?i|next|work.?on|what.*(do|build|tackle)/i.test(q),
    handle: () => ({
      agentId: 'session',
      agentName: 'Weekly Planner',
      steps: [
        { label: 'Checking project milestones', delayMs: 350 },
        { label: 'Reviewing opportunity scores', delayMs: 850 },
        { label: 'Reviewing agent health', delayMs: 1350 },
        { label: 'Weekly focus ready', delayMs: 1850 },
      ],
      response: `Weekly Focus  [SIMULATED]\n\n1 · Validate Freelancer Tax Stack (Opp. Radar #1, score 8.1)\n    Talk to 10 Indian freelancers this week.\n    Confirm they'd pay ₹3–8K/yr before writing a line of code.\n\n2 · Wire MailSage telemetry into Jarvis\n    The bot runs live on the droplet — dashboard just can't\n    see it yet. ~20 minutes of work to unlock real activity.\n\n3 · Fix Content Pulse error state\n    Rate limit hit. Check API quota or add backoff/retry.\n\n4 · NachleAI — go/no-go decision\n    8 validations done. What is the actual blocker this week?`,
      isSimulated: true,
    }),
  },
];

// ─── Fallback ────────────────────────────────────────────────────────────────

const FALLBACK: CommandResult = {
  agentId: 'session',
  agentName: 'Jarvis',
  steps: [
    { label: 'Processing command', delayMs: 350 },
    { label: 'No matching agent handler found', delayMs: 850 },
  ],
  response: `No handler found for that command.  [SIMULATED]\n\nTry:\n  "Run Opportunity Radar"\n  "What scored above 8?"\n  "Run FinSage"\n  "What needs my approval?"\n  "Summarize today"\n  "What should I focus on this week?"\n  "Run MailSage"\n  "Draft a LinkedIn post"`,
  isSimulated: true,
};

// ─── Public API ──────────────────────────────────────────────────────────────

export function resolveCommand(query: string): CommandResult {
  const q = query.trim();
  for (const handler of HANDLERS) {
    if (handler.test(q)) return handler.handle(q);
  }
  return FALLBACK;
}
