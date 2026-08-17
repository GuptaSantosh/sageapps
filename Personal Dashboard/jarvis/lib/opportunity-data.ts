/**
 * opportunity-data.ts — mock opportunity records for the Opportunity Radar workspace.
 *
 * All data is [DEMO] — illustrative only. Signals, scores, quotes, and source
 * citations are fictional examples designed to demonstrate the product structure.
 * Replace with real research output when live connectors are wired.
 *
 * 7 opportunities covering the spec categories:
 *  #1  Indian Freelancer Tax & Compliance Stack        — 8.1 — Validating
 *  #2  AI Product Launch Readiness Review              — 7.8 — Validate Now
 *  #3  AI Agent Audit Trail & Human Approval Layer     — 7.4 — Investigating
 *  #4  D2C Revenue Reconciliation (Shopify+Razorpay)   — 7.0 — Investigating
 *  #5  DPDP Act Compliance Documentation               — 6.3 — Watch
 *  #6  WhatsApp Chatbot Builder for CA Practices       — 4.6 — Rejected (platform risk fatal)
 *  #7  ROC/MCA Filing Assistant for Indian Startups    — 4.8 — Rejected (reach + WTP weak)
 */

import type {
  OpportunityRecord,
  EvidenceSignal,
  DetailedScorecard,
  CompetitiveAlternative,
  OpportunityThesis,
  ValidationPlan,
  ValidationChecklist,
} from './types';

// ─── Opportunity #1 ────────────────────────────────────────────────────────────
// Indian Freelancer Tax & Compliance Stack
// Category: finance/compliance for narrow SMB persona

const signals_001: EvidenceSignal[] = [
  {
    id: 's001-1',
    platform: 'Reddit',
    title: '"Freelancer GST filing is a nightmare — 3 portals, 2 CAs, still got a notice"',
    author: 'u/techfreelancer_blr',
    date: '2026-08-15',
    url: undefined,
    summary: 'Thread with 847 upvotes. Describes the quarterly GST → GSTR-1 → GSTR-3B loop, advance tax estimation errors, and TDS certificate collection from 6+ clients every quarter. Users in comments sharing CA bills of ₹18K–₹40K/yr for mostly mechanical work.',
    signalType: 'complaint',
  },
  {
    id: 's001-2',
    platform: 'YouTube',
    title: 'CA Rachana Ranade — "TDS for Freelancers" video comments',
    author: 'Multiple',
    date: '2026-08-11',
    url: undefined,
    summary: '1,200+ comments asking variants of "how do I file TDS when I have 8 clients?" and "my client deducted TDS but I can\'t find it in 26AS." Clear signal of repeated manual confusion at scale.',
    signalType: 'repeated-manual-workflow',
  },
  {
    id: 's001-3',
    platform: 'The Ken',
    title: 'Indian gig economy compliance gap — estimated 8M affected',
    author: 'The Ken editorial',
    date: '2026-08-08',
    url: undefined,
    summary: 'Paid newsletter reporting that India\'s ~8M independent contractors face a compliance burden that informal CA services and free government portals are unable to adequately solve. Article cites 3 founders who tried to build in this space and pivoted.',
    signalType: 'complaint',
  },
  {
    id: 's001-4',
    platform: 'Twitter/X',
    title: '"Every Indian freelancer dreads March" — thread',
    author: '@fintech_india',
    date: '2026-08-14',
    url: undefined,
    summary: 'Thread listing the 11 compliance events a freelancer must track across a financial year. Quoted by 340 people. Several replies mention paying CAs just for "peace of mind" despite not needing complex advice.',
    signalType: 'spending-intent',
  },
  {
    id: 's001-5',
    platform: 'Indie Hackers',
    title: '"Built a GST invoice tool for freelancers — 2K signups in 10 days, 0 paid conversions"',
    author: 'IH user: varunbuilds',
    date: '2026-08-03',
    url: undefined,
    summary: 'Founder validated the problem (high demand) but couldn\'t convert because users expected free tools. Interesting signal: problem is real, but willingness to pay needs the right framing — possibly compliance risk/CA replacement, not "invoice tool".',
    signalType: 'workaround',
  },
];

const scorecard_001: DetailedScorecard = {
  painSeverity: { score: 8, justification: 'Repeatedly described as "the most stressful part of freelancing." Real financial risk (notices, penalties) amplifies emotional pain beyond inconvenience.' },
  frequency: { score: 9, justification: 'Monthly (GSTR-3B), quarterly (advance tax, GSTR-1), annual (ITR-4). Every few weeks there is something to do or worry about.' },
  willingnessToPay: { score: 6, justification: 'Already paying CAs ₹15K–₹40K/year. Substitution framing (replace your CA for routine work) is more compelling than "another tool." WTP exists but needs the right positioning.' },
  founderFit: { score: 9, justification: 'TaxSage + FinSage give direct credibility in the tax space. Existing user base of 3,800 MAU who trust Santosh\'s tools for tax calculations. Distribution advantage is real.' },
  customerReach: { score: 7, justification: 'LinkedIn, IIM alumni network, Twitter/X, and the TaxSage user base provide warm channels. Freelancer communities on Reddit and Telegram are accessible.' },
  speedToValidate: { score: 8, justification: 'Landing page + 10 interviews could be done in one week. Existing TaxSage audience makes recruitment trivial.' },
  competitionIntensity: { score: 6, justification: 'ClearTax and Quicko serve SMBs. No dedicated AI-native freelancer compliance co-pilot. The gap is at the intersection of proactive guidance + AI + unified portal.' },
  platformRisk: { score: 8, justification: 'Govt APIs (GST portal, TRACES, ITR portal) are stable but occasionally change schemas. No single private platform dependency. Risk is manageable.' },
  defensibility: { score: 6, justification: 'Data moat once users upload docs and link portals. Brand moat from TaxSage credibility. Not deeply defensible from day one, but grows over time.' },
  revenuePotential: { score: 8, justification: '₹3K–₹8K/year × 50,000 users = ₹15–40Cr ARR. Plausible at 2-year horizon given tax season concentration and word-of-mouth in professional communities.' },
  overall: 8.1,
  weightedNote: 'High score driven by strong founder fit and frequency. WTP drag is manageable with correct positioning. Biggest risk is commoditization by ClearTax or government portal improvements.',
};

const alternatives_001: CompetitiveAlternative[] = [
  { name: 'ClearTax', type: 'competitor', gap: 'Targets SMBs and chartered accountants, not freelancers. No proactive "here\'s what\'s due this week" guidance. No AI layer.' },
  { name: 'Quicko', type: 'competitor', gap: 'Strong on ITR filing but no ongoing compliance monitoring or TDS collection workflow.' },
  { name: 'Local CA on retainer', type: 'incumbent', gap: 'Expensive (₹15K–₹40K/year), slow, not available on WhatsApp at 11pm when you have a question.' },
  { name: 'Government portals (GST, ITR, TRACES)', type: 'workaround', gap: 'Three separate portals, no cross-linking, no reminders, no interpretation layer.' },
  { name: 'DIY in Excel / Google Sheets', type: 'workaround', gap: 'Manual, error-prone, breaks when tax rules change, requires self-education.' },
  { name: 'Do nothing (pay penalty later)', type: 'do-nothing', gap: 'Real behavior for 40%+ of freelancers. Creates demand for reactive CA services rather than preventive tools.' },
];

const thesis_001: OpportunityThesis = {
  problem: 'Indian independent contractors (freelancers, consultants, gig workers) face a uniquely painful compliance stack: quarterly GST filings, advance tax estimates, TDS certificate collection from multiple clients, and ITR-4 at year-end — each requiring different government portals with no unified view and no proactive reminders.',
  whoExperiencesIt: 'India\'s ~8M independent contractors, with acute pain concentrated among those earning ₹10–₹60L per year — high enough to be under full compliance requirements, too busy to handle it themselves, and not large enough to justify an in-house accountant.',
  whyItHurts: 'Missed deadlines incur penalties and interest. Government notices create anxiety disproportionate to the actual financial risk. The cognitive overhead of tracking multiple compliance events while running a client business is significant and recurring.',
  whyTheyMightPay: 'They are already paying CAs ₹15K–₹40K/year for work that is largely mechanical. A tool that eliminates routine CA interactions (while referring to a human for complex situations) has a clear substitution case. Pain is high enough that positioning around "avoid penalty + notice" converts.',
  whyNow: 'GST compliance has matured enough that API access to portals is reliable. AI makes the interpretation layer (what does this AIS discrepancy mean? what should I file?) genuinely useful for the first time. The TaxSage user base provides a warm, validated distribution channel to test with immediately.',
};

const validationPlan_001: ValidationPlan = {
  targetPersona: 'Indian freelancer or independent consultant, ₹15–₹50L annual income, paying a CA ₹10K+/year, not living in a metro (where CAs are easier to access).',
  peopleToFind: [
    'LinkedIn: search "freelance developer India" + "consultant" + location Tier-2 city',
    'TaxSage user base: email users who analyzed Form 16 as freelancers (ask CA Vikram to help segment)',
    'Reddit r/IndiaInvestments: DM users who commented on GST/TDS threads',
    'Twitter/X: reply to the @fintech_india thread — responders are pre-qualified',
    'IIM alumni network: MBA freelance consultants are common and have budget',
  ],
  interviewQuestions: [
    'Walk me through the last time you had to deal with a GST filing or advance tax payment. What happened, step by step?',
    'What do you pay your CA per year, and what specifically do they do for you that you couldn\'t figure out yourself?',
    'If there was a tool that tracked every compliance deadline, told you exactly what to file and when, and let you do it yourself with guidance — what would that need to do before you\'d trust it over your CA?',
  ],
  smallestPrototype: 'A Telegram bot that tracks compliance deadlines based on PAN/GSTIN input, sends reminders 7 days before each deadline, and answers "what do I file next?" in plain language. No portal integration required to test the core hypothesis.',
  strongestAssumption: 'Freelancers will pay ₹3K–₹6K/year for a compliance co-pilot, not just expect it to be free like every other fintech tool in India.',
  successSignal: '3 out of 10 interviewees say they\'d pay ₹3K+ per year and can articulate why this replaces a CA service they currently use. At least 1 asks "where can I sign up today?"',
  killSignal: 'All 10 interviewees want it to be free, or say they\'d just ask their CA to use it on their behalf (meaning the CA, not the freelancer, is the actual customer).',
};

const validationChecklist_001: ValidationChecklist = {
  usersIdentified: true,
  conversationsCompleted: 3,
  problemConfirmed: 3,
  solutionRequested: 1,
  willingnessToPaySignal: false,
  workaroundDocumented: true,
};

// ─── Opportunity #2 ────────────────────────────────────────────────────────────
// AI Product Launch Readiness Review for Vibe-Coded SaaS
// Category: AI product launch/readiness risk review for AI-built SaaS founders

const signals_002: EvidenceSignal[] = [
  {
    id: 's002-1',
    platform: 'Reddit',
    title: '"Shipped my AI SaaS in 3 days with Cursor, got a security report 2 weeks later"',
    author: 'u/vibe_coded_founder',
    date: '2026-08-10',
    url: undefined,
    summary: 'Founder built and launched a B2B SaaS using Cursor + Claude in 72 hours. Received a responsible disclosure report citing SQL injection, exposed API keys in client-side JS, and no rate limiting on authentication. 340 upvotes in r/SideProject.',
    signalType: 'complaint',
  },
  {
    id: 's002-2',
    platform: 'Twitter/X',
    title: '"AI-built SaaS gets breached 9 days after launch" — thread going viral',
    author: '@swyx',
    date: '2026-08-05',
    url: undefined,
    summary: 'Thread documenting a real breach of an AI-built SaaS tool. Author lists 6 common security anti-patterns found in vibe-coded products. 4K+ likes, 800+ retweets. Comments filled with founders saying "oh god I think I have this too."',
    signalType: 'competitor-dissatisfaction',
  },
  {
    id: 's002-3',
    platform: 'Indie Hackers',
    title: '"What do you check before going public?" — 80+ responses',
    author: 'Multiple IH members',
    date: '2026-08-12',
    url: undefined,
    summary: 'IH discussion showing founders have wildly different checklists. Most responses focus on marketing, not security or compliance. Several founders admit they had never done a security review. Strong signal of unmet need for a structured pre-launch checklist.',
    signalType: 'request',
  },
  {
    id: 's002-4',
    platform: 'Product Hunt',
    title: 'Security tools for developers dominate recent launches',
    author: 'PH trending data',
    date: '2026-08-13',
    url: undefined,
    summary: 'Three security/compliance tools in the top 20 PH launches in August 2026. All positioned at developers. None specifically targeting the "solo AI founder going to market" workflow. Gap is in the founder-friendly, non-technical framing.',
    signalType: 'spending-intent',
  },
  {
    id: 's002-5',
    platform: 'Substack',
    title: '"The AI founder\'s liability blindspot" — 3,200 opens',
    author: 'Lenny\'s Newsletter',
    date: '2026-08-01',
    url: undefined,
    summary: 'Newsletter piece arguing that AI-assisted development is creating a generation of founders who can ship faster than they can understand what they\'ve built. Specific mention of DPDP, GDPR, PCI-DSS, and rate limiting as common gaps.',
    signalType: 'complaint',
  },
];

const scorecard_002: DetailedScorecard = {
  painSeverity: { score: 8, justification: 'A breach or compliance failure at launch can kill a product before it gets traction. The combination of reputational and legal risk creates acute anxiety for founders who recognize the gap.' },
  frequency: { score: 6, justification: 'One-time event per product, but founders launch multiple products. Recurring as the AI-assisted dev wave continues — new founders enter the space every month.' },
  willingnessToPay: { score: 7, justification: 'Founders pay for peace of mind pre-launch. Bug bounty platforms (Intigriti, HackerOne) charge $5K–$50K for similar assurance. A $200–$500 "launch readiness review" is a clear bargain framing.' },
  founderFit: { score: 8, justification: 'Santosh is an AI-first founder who builds with Cursor/Claude — deeply understands the workflow and the specific gaps. Could build the reviewer as a companion to his own launch process.' },
  customerReach: { score: 8, justification: 'Twitter/X AI builder community, IH, Product Hunt, and r/SideProject are all extremely accessible. Direct message to founders who tweet about shipping — zero-friction outreach.' },
  speedToValidate: { score: 9, justification: 'Deliver the review as a manual service first (Santosh personally reviews 5 products). No code required to test WTP. If 3 of 5 pay $100+, automate it.' },
  competitionIntensity: { score: 7, justification: 'Snyk, GitHub Advanced Security are developer-focused, technical, not founder-friendly. No product exists specifically for "solo AI founder pre-launch checklist." Gap is real.' },
  platformRisk: { score: 9, justification: 'No platform dependency. Review delivered as a document or report. Could integrate GitHub scanning APIs but not dependent on them.' },
  defensibility: { score: 5, justification: 'The checklist can be copied. Long-term defensibility requires either a live scanning tool (code) or a brand as "the launch safety partner for AI founders." Neither exists today.' },
  revenuePotential: { score: 6, justification: 'One-time fee of $200–$500 per review limits ARR unless converted to a subscription (ongoing monitoring). Market is real but smaller than the compliance stack opportunity.' },
  overall: 7.8,
  weightedNote: 'Strong founder fit and fast validation path push score up. Revenue potential and defensibility pull it down. Best validated as a manual service before automating.',
};

const alternatives_002: CompetitiveAlternative[] = [
  { name: 'Snyk / Semgrep', type: 'competitor', gap: 'Developer-facing, technical, not founder-friendly. Requires CI/CD integration. No "plain English launch readiness report."' },
  { name: 'Bugcrowd / Intigriti', type: 'competitor', gap: 'Enterprise pricing ($5K+). Not accessible for solo founders. Process takes weeks.' },
  { name: 'DIY GitHub Copilot security scan', type: 'workaround', gap: 'Inconsistent, depends on coding skill. Doesn\'t cover non-code issues (privacy policy, data handling, DPDP compliance).' },
  { name: 'Ask a developer friend to review', type: 'workaround', gap: 'Inconsistent coverage, relationship cost, can\'t be repeated at scale.' },
  { name: 'Do nothing and hope for the best', type: 'do-nothing', gap: 'Current default. Creates the breach stories that generate the demand signal.' },
];

const thesis_002: OpportunityThesis = {
  problem: 'Founders using AI-assisted development tools (Cursor, Claude, Copilot) can ship production-grade products in days without accumulating the institutional security knowledge that experienced engineering teams develop over years. The gap shows up as breaches, compliance failures, and exposed data within weeks of launch.',
  whoExperiencesIt: 'Solo AI founders, indie hackers, and small product teams (1–3 people) who are shipping SaaS products using AI code generation. Most prominent among non-engineer founders who understand the product but not the security layer.',
  whyItHurts: 'A breach in the first 30 days of a product is often fatal — reputation damage before trust is established, potential legal liability, and user loss that compounds before word-of-mouth has a chance to build. The stakes are disproportionately high relative to the probability.',
  whyTheyMightPay: 'Pre-launch peace of mind is a proven category (insurance, legal review, penetration testing). A $200–$500 "launch readiness review" competes with a single hour of a security consultant\'s time, with a faster turnaround and a founder-friendly output format.',
  whyNow: 'The AI-assisted development wave has fundamentally changed who can ship software. The cohort of "non-engineer AI founders" is growing exponentially but has no equivalent "non-engineer security review" product. The problem is new and growing faster than any existing solution addresses it.',
};

const validationPlan_002: ValidationPlan = {
  targetPersona: 'Solo founder or 1–2 person team, using Cursor / Claude to build a SaaS product, within 30 days of intended launch, not from a software engineering background.',
  peopleToFind: [
    'Twitter/X: reply to anyone tweeting "shipped my SaaS" or "built with cursor" in the last 7 days',
    'IH: post in "Current Projects" section offering 3 free launch reviews in exchange for feedback',
    'r/SideProject: comment on "roast my idea" or "I shipped X" posts with security angle',
    'LinkedIn: target product managers and business founders who tweet about building with AI',
    'Discord: join AI builder communities (Latent Space, Buildspace alumni) and offer the review',
  ],
  interviewQuestions: [
    'When you launched your last product, what did you do to make sure it was safe before going public?',
    'Have you ever had a security issue after launch, or worried about one? What happened?',
    'If someone offered to review your product for security and compliance gaps and give you a plain-English report before you launch — what would that be worth to you?',
  ],
  smallestPrototype: 'Manually review 5 products as a human expert. Deliver a one-page "Launch Readiness Report" PDF covering: top 3 security issues found, data handling gaps, missing privacy/terms page, rate limiting, exposed secrets. Charge $100–$200 per review. See if 3 of 5 pay.',
  strongestAssumption: 'Founders will pay before launch (anxiety stage), not after a breach (regret stage, too late). Timing of purchase intent is the biggest unknown.',
  successSignal: '3 out of 5 pilot customers pay without negotiating price, and at least 2 refer a founder friend within 2 weeks.',
  killSignal: 'All founders say "I\'ll do it after I have users" or "my co-founder/developer already checked." Indicates the buying moment hasn\'t arrived yet or the problem is being solved internally.',
};

// ─── Opportunity #3 ────────────────────────────────────────────────────────────
// AI Agent Audit Trail & Human Approval Layer
// Category: AI agent reliability / human approval / audit visibility

const signals_003: EvidenceSignal[] = [
  {
    id: 's003-1',
    platform: 'Twitter/X',
    title: '"Our AI email agent accidentally sent 200 apology emails to wrong customers"',
    author: '@adrianhorning',
    date: '2026-08-09',
    url: undefined,
    summary: 'Founder describes an AI agent misfire that sent bulk emails without the intended human review step. 1.2K likes. Replies converge on "we had the same issue." No good tooling to audit exactly what the agent did or why.',
    signalType: 'complaint',
  },
  {
    id: 's003-2',
    platform: 'Hacker News',
    title: '"Ask HN: How do you audit AI agent decisions in production?"',
    author: 'HN user: throwaway_prod',
    date: '2026-08-06',
    url: undefined,
    summary: '87 comments, no clear consensus answer. Responses range from "we log everything manually" to "we haven\'t figured this out yet." Enterprise comments mention compliance requirements (SOC2, GDPR) that technically require agent action auditability.',
    signalType: 'request',
  },
  {
    id: 's003-3',
    platform: 'Substack',
    title: '"The human-in-the-loop problem is unsolved" — AI infrastructure newsletter',
    author: 'The Pragmatic Engineer',
    date: '2026-08-01',
    url: undefined,
    summary: 'Detailed post on the engineering gap between "AI agent can do X" and "we can safely deploy AI agent to do X for customers." Specifically calls out lack of replay, audit trail, and approval workflow tooling. 15K subscribers.',
    signalType: 'repeated-manual-workflow',
  },
  {
    id: 's003-4',
    platform: 'Indie Hackers',
    title: '"Building AI agent workflows for SMBs — approval step is the biggest friction"',
    author: 'IH user: rpatools',
    date: '2026-08-14',
    url: undefined,
    summary: 'Founder building automation tools for SMBs says every client wants a "someone has to approve this before it goes" step. No off-the-shelf solution exists for non-engineering teams. Clients compare to "DocuSign but for AI decisions."',
    signalType: 'request',
  },
];

const scorecard_003: DetailedScorecard = {
  painSeverity: { score: 8, justification: 'An unauditable AI agent is a liability in regulated industries and an enterprise sales blocker in any industry. The pain is existential for founders trying to sell AI workflows to risk-aware buyers.' },
  frequency: { score: 6, justification: 'Not daily friction but a structural blocker — it prevents selling to enterprise and regulated segments entirely. High-impact, low-frequency pain.' },
  willingnessToPay: { score: 7, justification: 'Enterprise software buyers pay for compliance and audit capability. This is a classic "unlock the deal" purchase. Seed-stage AI founders also pay for tools that help them sell to enterprises.' },
  founderFit: { score: 8, justification: 'Santosh is building Jarvis — a human approval layer for AI agents. This product is literally the problem he is already solving for himself. Built-in credibility and deep problem familiarity.' },
  customerReach: { score: 6, justification: 'The customer is "teams deploying AI agents" — reachable via developer conferences, Slack communities (a16z SPEEDRUN, Latent Space), and direct outreach to founders building AI automation.' },
  speedToValidate: { score: 7, justification: 'A working prototype of an approval interface + audit log for a specific agent (e.g., email agent) could be built in 2–3 days. Finding 5 buyers willing to install it is the harder step.' },
  competitionIntensity: { score: 6, justification: 'Langchain, Langfuse, Braintrust offer observability but not human-in-the-loop approval flows. Workflow tools (Make.com, Zapier) have approval steps but no AI-specific audit trail. Gap exists at the intersection.' },
  platformRisk: { score: 7, justification: 'Integrations with individual agent frameworks (LangChain, CrewAI, custom) could break. Not dependent on a single external platform. Risk is integration maintenance, not existential.' },
  defensibility: { score: 6, justification: 'Network effects if multiple teams using the same approval platform. Data moat from audit trails. Switching cost grows as teams build compliance processes around the tool.' },
  revenuePotential: { score: 7, justification: '$500–$2K/month per team in early AI automation companies. 200 teams = $1.2–$4.8M ARR. Enterprise pricing could push higher.' },
  overall: 7.4,
  weightedNote: 'Strong founder fit and real enterprise demand, but customer reach and speed to validate are harder than #1 or #2. Market is earlier-stage — buyers exist but finding them requires specific community access.',
};

const alternatives_003: CompetitiveAlternative[] = [
  { name: 'Langfuse / Braintrust', type: 'competitor', gap: 'Observability and eval tools, not approval workflow. Show you what happened but don\'t help you control what can happen.' },
  { name: 'Zapier / Make.com approval steps', type: 'workaround', gap: 'Works for simple workflows but has no AI-specific context, no LLM trace, no compliance report generation.' },
  { name: 'Manual Slack/email approval chains', type: 'workaround', gap: 'What most teams do today. No audit trail, fragile, doesn\'t scale beyond 2–3 people.' },
  { name: 'Fly under the radar (deploy without approval layer)', type: 'do-nothing', gap: 'Current default for most early AI founders. Works until the first incident or the first enterprise prospect asks "show me your approval process."' },
];

const thesis_003: OpportunityThesis = {
  problem: 'Teams deploying AI agents in production — for email, finance, customer operations, and internal workflows — have no standardized way to record what an agent did, replay decisions for audit, pause and require human approval before high-stakes actions, or generate a compliance report for enterprise buyers.',
  whoExperiencesIt: 'AI-first startups (5–50 people) deploying agents in customer-facing or regulated workflows, and the enterprise compliance teams trying to buy from them.',
  whyItHurts: 'Without an audit trail, an AI agent is not enterprise-saleable. Without a human-approval layer, one agent misfire is a reputational or legal event. Both problems become more acute as AI agents handle higher-value decisions.',
  whyTheyMightPay: 'This product unlocks enterprise deals that are currently blocked by compliance questions. The ROI is measurable: "we closed a $50K/year enterprise contract that was blocked because they asked about our audit trail."',
  whyNow: 'AI agents are moving from demos to production. The enterprise wave is starting. The window to become the standard audit/approval infrastructure is open now, before hyperscalers (AWS, Azure) build it natively.',
};

// ─── Opportunity #4 ────────────────────────────────────────────────────────────
// D2C Revenue Reconciliation for Indian Brands
// Category: finance/reconciliation for narrow SMB persona

const signals_004: EvidenceSignal[] = [
  {
    id: 's004-1',
    platform: 'Reddit',
    title: '"Shopify says ₹8.2L, Razorpay says ₹7.9L, my bank says ₹7.6L. Which one do I believe?"',
    author: 'u/d2c_founder_pune',
    date: '2026-08-13',
    url: undefined,
    summary: 'Post in r/IndiaBusiness with 412 upvotes. Founder of a ₹1Cr/month D2C brand describes spending 3 days each month reconciling 4 data sources. Comments: 23 other founders describe identical problem, 0 describe a solved solution.',
    signalType: 'complaint',
  },
  {
    id: 's004-2',
    platform: 'Twitter/X',
    title: '"D2C founder tax season confession" thread',
    author: '@d2c_india_pod',
    date: '2026-08-07',
    url: undefined,
    summary: 'Podcast host asks D2C founders about their bookkeeping process. Thread of 40+ replies: 80% use Excel/Sheets, 15% use a part-time accountant who also uses Excel, 5% have integrated accounting software. Most cite Razorpay settlement timing as the core confusion.',
    signalType: 'repeated-manual-workflow',
  },
  {
    id: 's004-3',
    platform: 'Indie Hackers',
    title: '"Built a Razorpay-Shopify sync tool — got 400 signups but killed it"',
    author: 'IH user: rithwik_k',
    date: '2026-08-01',
    url: undefined,
    summary: 'Founder who built a partial solution but couldn\'t get enough paying conversions because users expected it to be free. Key insight: users valued the problem (₹5K/month accountant fees) but anchored on the price of free Indian fintech tools.',
    signalType: 'workaround',
  },
  {
    id: 's004-4',
    platform: 'LinkedIn',
    title: '"Finance for D2C founders" live session — 800 registrants',
    author: 'CA Nikhil Gupta',
    date: '2026-08-04',
    url: undefined,
    summary: 'Webinar on "understanding your D2C numbers" drew 800 registrants, suggesting high latent demand for financial clarity. Most attendee questions were about reconciliation, GST on returns/discounts, and "which number do I give my investor?"',
    signalType: 'request',
  },
];

const scorecard_004: DetailedScorecard = {
  painSeverity: { score: 7, justification: 'Monthly reconciliation blocking accurate financial reporting creates real business risk — wrong GST filings, incorrect COGS, confused investor updates. High-stakes but not as acutely felt as tax penalties.' },
  frequency: { score: 8, justification: 'Monthly cycle: every closing, the founder or their accountant manually reconciles 4 systems. 12 painful sessions per year, with extra sessions around GST filings and annual audit.' },
  willingnessToPay: { score: 7, justification: 'Already paying accountants ₹5K–₹15K/month for work that is largely this reconciliation. A tool at ₹2K–₹5K/month with better accuracy has a clear substitution story.' },
  founderFit: { score: 6, justification: 'Adjacent to FinSage\'s territory (financial reconciliation, India-specific) but requires deep integrations with Shopify, Razorpay, GST portal. Steeper build than existing tools.' },
  customerReach: { score: 7, justification: 'D2C founder communities are active on LinkedIn and Twitter. Shopify India Partner ecosystem provides warm introductions. Razorpay\'s ecosystem might provide distribution.' },
  speedToValidate: { score: 6, justification: 'Integration complexity means even a landing page MVP requires some functional demo. Manual reconciliation service as a first step would work but is time-intensive.' },
  competitionIntensity: { score: 6, justification: 'Zoho Books, Tally, Khatabook serve this market but none have a great Shopify+Razorpay+GST reconciliation flow. Gap is in the intersection of e-commerce + India GST + real-time accuracy.' },
  platformRisk: { score: 6, justification: 'Shopify, Razorpay, and GST portal API changes could all affect the tool. Three dependency chains to maintain. Higher platform risk than other opportunities.' },
  defensibility: { score: 7, justification: 'Once integrated and trusted with financial data, switching cost is high. Historical data creates a meaningful moat. Accountant partnerships could accelerate network effects.' },
  revenuePotential: { score: 7, justification: '₹2K–₹5K/month × 2,000 D2C brands = ₹4.8–₹12Cr ARR. Addressable market is real if distribution through accountant partners is achieved.' },
  overall: 7.0,
  weightedNote: 'Solid opportunity but higher build complexity and integration risk than #1 and #2. Founder fit is lower — requires deep e-commerce/reconciliation knowledge to build credibly.',
};

const alternatives_004: CompetitiveAlternative[] = [
  { name: 'Zoho Books / Tally', type: 'incumbent', gap: 'Not real-time. Manual import of Shopify/Razorpay data. No auto-reconciliation logic for settlement timing differences.' },
  { name: 'Khatabook / OkCredit', type: 'competitor', gap: 'Serve micro-merchants. Not designed for D2C brands with Shopify + multiple payment gateways.' },
  { name: 'Part-time accountant doing it in Excel', type: 'workaround', gap: 'The current market standard. ₹5K–₹15K/month, error-prone, 2-3 day lag in reporting.' },
  { name: 'Razorpay Smart Collect reports', type: 'workaround', gap: 'Only one side of the reconciliation. Doesn\'t include Shopify inventory, GST portal, or returns.' },
];

const thesis_004: OpportunityThesis = {
  problem: 'Indian D2C brands with ₹50L–₹5Cr monthly revenue get four different revenue numbers every month from Shopify (orders), Razorpay (settlements), their bank (deposits), and the GST portal (taxable transactions). Monthly reconciliation is done manually in Excel, taking 3–7 days per cycle and producing results that no one fully trusts.',
  whoExperiencesIt: 'Founders and finance leads at Indian D2C brands in the ₹50L–₹5Cr monthly revenue range — large enough to have real complexity but small enough that they lack dedicated finance operations teams.',
  whyItHurts: 'Wrong reconciliation leads to wrong GST filings (penalty risk), wrong investor updates (trust damage), incorrect COGS and margin calculations, and delayed monthly close. The problem compounds with every additional payment gateway, return window, or discount campaign.',
  whyTheyMightPay: 'The alternative is paying a part-time accountant ₹5K–₹15K/month to do work that is largely mechanical and still contains errors. A ₹2K–₹5K/month tool with better accuracy and real-time visibility has a clear ROI story.',
  whyNow: 'Shopify India volumes have grown significantly. Razorpay API is mature. GST e-invoicing mandate has forced more D2C brands to improve their financial data infrastructure. The ecosystem is ready for automation in a way it wasn\'t 2 years ago.',
};

// ─── Opportunity #5 ────────────────────────────────────────────────────────────
// DPDP Act Compliance Documentation Tool
// Category: documentation/compliance-heavy workflow

const signals_005: EvidenceSignal[] = [
  {
    id: 's005-1',
    platform: 'LinkedIn',
    title: '"Does DPDP apply to my startup?" — 180 comments',
    author: 'Advocate Priya Sethuraman',
    date: '2026-08-11',
    url: undefined,
    summary: 'Post asking a basic DPDP question generated 180 comments with wildly different answers, suggesting widespread uncertainty. Most startup founders don\'t know whether/how the act applies to them, what filings are required, or what timeline they\'re under.',
    signalType: 'complaint',
  },
  {
    id: 's005-2',
    platform: 'Reddit',
    title: '"Our B2B SaaS enterprise prospect asked us for DPDP compliance documentation. We had none."',
    author: 'u/saas_founder_hyd',
    date: '2026-08-08',
    url: undefined,
    summary: 'Founder describes losing a ₹12L enterprise deal because they couldn\'t produce a data processing agreement and privacy notice compliant with the new DPDP Act. Comments: 5 similar stories. Signal of blocked deals, not just regulatory confusion.',
    signalType: 'spending-intent',
  },
  {
    id: 's005-3',
    platform: 'Substack',
    title: '"DPDP is real and startups are not ready" — tech law newsletter',
    date: '2026-08-05',
    url: undefined,
    summary: 'Indian tech law newsletter (2,400 subscribers) estimates that fewer than 15% of Indian digital startups have completed minimum DPDP compliance steps. Highlights three specific documents every B2C app needs: privacy notice, consent management record, grievance officer appointment.',
    signalType: 'complaint',
  },
];

const scorecard_005: DetailedScorecard = {
  painSeverity: { score: 6, justification: 'Real compliance risk but enforcement has been slow. Pain is more acute for companies with enterprise B2B sales than pure B2C. Not yet an acute crisis for most startups.' },
  frequency: { score: 4, justification: 'One-time compliance project (draft documents, publish policy, set up processes) with annual review. Low frequency limits recurring revenue model.' },
  willingnessToPay: { score: 6, justification: 'When a deal is blocked by compliance documentation, WTP spikes. Ongoing WTP for monitoring/updating is lower. Legal services market analogy: lawyers charge ₹50K–₹2L for these documents.' },
  founderFit: { score: 5, justification: 'Adjacent to the regulatory/compliance space Santosh understands, but requires deep DPDP-specific legal knowledge or legal partnerships to be credible. Not a natural extension of current tools.' },
  customerReach: { score: 6, justification: 'Target customers are reachable via LinkedIn (B2B SaaS founders), but compliance buyers inside companies are often legal/ops, not founders. Selling to lawyers is harder than selling to founders.' },
  speedToValidate: { score: 7, justification: 'A document generator (privacy notice, DPA, consent record template) could be built in a weekend using AI. The validation question is whether founders would pay or expect a lawyer to handle it.' },
  competitionIntensity: { score: 6, justification: 'LegalWiz, IndiaFilings have generic legal document tools. No specialized DPDP compliance tool exists. Gap is in the DPDP-specific, startup-friendly product layer.' },
  platformRisk: { score: 9, justification: 'No platform dependency. Pure document generation and compliance tracking. Government DPDP portal may eventually handle this, but timeline is unclear.' },
  defensibility: { score: 4, justification: 'Low switching cost. Templates can be copied. Defensibility requires either a subscription (ongoing monitoring) or network effects (lawyer/CA referral network).' },
  revenuePotential: { score: 5, justification: 'One-time fee of ₹5K–₹20K per company limits ARR. Subscription model for ongoing monitoring could improve this, but churn risk is high once compliance is "done."' },
  overall: 6.3,
  weightedNote: 'Real problem with clear regulatory backing, but low frequency and defensibility limit the opportunity. Best as an add-on to an existing legal-tech or founder-tools product rather than a standalone.',
};

const alternatives_005: CompetitiveAlternative[] = [
  { name: 'IndiaFilings / LegalWiz', type: 'competitor', gap: 'Generic legal document tools, not DPDP-specific. Don\'t provide startup-friendly guidance on what exactly to do and in what order.' },
  { name: 'External law firm or legal consultant', type: 'incumbent', gap: 'Expensive (₹50K–₹2L), slow, not available on demand. Knowledge doesn\'t stay inside the company after the engagement.' },
  { name: 'Copy-paste from competitor privacy policy', type: 'workaround', gap: 'Legal risk (incorrect terms), potentially out of date, doesn\'t address DPDP-specific requirements.' },
  { name: 'Ignore and wait for enforcement', type: 'do-nothing', gap: 'Current default for most startups. Creates the blocked-deal moments that generate demand.' },
];

const thesis_005: OpportunityThesis = {
  problem: 'India\'s Digital Personal Data Protection Act 2023 requires digital businesses to publish compliant privacy notices, maintain consent records, appoint a grievance officer, and implement data handling processes. Most Indian startups don\'t know exactly what they need, in what priority, and enterprise buyers are starting to ask for it as a deal condition.',
  whoExperiencesIt: 'Indian digital startups and SaaS companies, particularly those selling to enterprise or regulated sectors where compliance questions arise in sales processes.',
  whyItHurts: 'A blocked enterprise deal due to missing compliance documentation has immediate, measurable revenue impact. Regulatory enforcement risk, while currently low, is increasing. The pain is sporadic but high-stakes when it hits.',
  whyTheyMightPay: 'When a ₹10L+ enterprise deal is blocked by a compliance documentation gap, founders will pay to unblock it quickly. The immediate ROI is clear and measurable.',
  whyNow: 'DPDP Act came into force in 2023. Enforcement machinery is being set up. Enterprise procurement teams are increasingly asking for it in vendor questionnaires. The window of "first to be compliant in our space" is still open.',
};

// ─── Opportunity #6 ────────────────────────────────────────────────────────────
// WhatsApp Chatbot Builder for CA/Tax Practices
// Category: platform risk too high → REJECTED

const signals_006: EvidenceSignal[] = [
  {
    id: 's006-1',
    platform: 'LinkedIn',
    title: '"CA practices need WhatsApp automation — market is wide open"',
    author: 'u/ca_tech_evangelist',
    date: '2026-07-20',
    url: undefined,
    summary: 'Post arguing that India\'s 300K+ chartered accountant practices are underserved by technology and rely heavily on WhatsApp for client communication. Suggested a WhatsApp bot that handles appointment scheduling, document requests, and reminders.',
    signalType: 'request',
  },
  {
    id: 's006-2',
    platform: 'Product Hunt',
    title: 'WhatsApp CRM for professionals — 3 failed launches in 18 months',
    date: '2026-07-15',
    url: undefined,
    summary: 'PH data showing three similar products in the "WhatsApp for professional services" space that each got initial traction (200–500 upvotes) but failed to convert to revenue. One founder\'s post-mortem: "WhatsApp Business API kept changing, we couldn\'t keep up."',
    signalType: 'competitor-dissatisfaction',
  },
];

const scorecard_006: DetailedScorecard = {
  painSeverity: { score: 6, justification: 'CA practices do have real operational inefficiency, but the pain is distributed and tolerated — CAs use WhatsApp manually and this is culturally ingrained rather than acutely painful.' },
  frequency: { score: 7, justification: 'Daily client communication via WhatsApp. High frequency, but the manual work is habitual rather than acutely frustrating.' },
  willingnessToPay: { score: 3, justification: 'CA practices in India are notoriously conservative buyers. Typically prefer free tools, pirated software, or minimal spend. SaaS ACV for this segment rarely exceeds ₹5K–₹10K/year, insufficient for the build + API cost.' },
  founderFit: { score: 5, justification: 'Adjacent to the CA/tax ecosystem but requires deep understanding of CA practice workflows and trust from a conservative buyer segment not easily reached through Santosh\'s current channels.' },
  customerReach: { score: 4, justification: 'CAs are not on Product Hunt or IH. They are reachable through ICAI chapter events and CA study circles — expensive, slow, offline channels with long sales cycles.' },
  speedToValidate: { score: 5, justification: 'WhatsApp Business API requires Meta business verification (weeks). Building a meaningful demo takes longer than other opportunities. Validation cycle is slow.' },
  competitionIntensity: { score: 4, justification: 'Several WhatsApp CRM tools exist. Differentiation is difficult when the core product is "WhatsApp but automated" — the API is the same for everyone.' },
  platformRisk: { score: 2, justification: 'FATAL: Meta/WhatsApp Business API has changed pricing, throttled bots, and banned accounts with no notice. Three failed products in 18 months in this exact category. Single-platform dependency on a platform with a history of adversarial policy changes toward developers.' },
  defensibility: { score: 3, justification: 'No data moat. WhatsApp messages are owned by the user. Low switching cost. If Meta changes API pricing or policy, the entire product is at risk overnight.' },
  revenuePotential: { score: 4, justification: 'Low WTP per CA practice × conservative churn resistance = very difficult path to meaningful ARR. Market fragmentation (300K CAs but tiny practices) makes CAC economics hard.' },
  overall: 4.6,
  weightedNote: 'REJECTED. Platform risk score of 2 is fatal — this has killed multiple similar products. Even if all other scores were higher, a business that can be shut down by a single API policy change is not viable.',
};

const alternatives_006: CompetitiveAlternative[] = [
  { name: 'Interakt, AiSensy, Wati (WhatsApp CRM tools)', type: 'competitor', gap: 'These products are competing in the same space and facing the same platform risk. Their existence validates the problem but also validates that the path is difficult.' },
  { name: 'Manual WhatsApp + Excel tracking', type: 'workaround', gap: 'What every CA practice does today. Inefficient but free and not at risk of being shut down by Meta.' },
  { name: 'Traditional CRM (Zoho, Freshsales)', type: 'workaround', gap: 'CAs rarely use them — too complex, wrong metaphor, not WhatsApp-native which is where clients already are.' },
];

const thesis_006: OpportunityThesis = {
  problem: 'India\'s 300K+ CA practices manage client relationships primarily through WhatsApp, creating operational inefficiency in document collection, appointment scheduling, and compliance reminders. A purpose-built WhatsApp automation tool could address this.',
  whoExperiencesIt: 'Small CA practices (1–5 CAs), which make up the majority of the India market, handling 50–200 clients each across ITR, GST, and company law filings.',
  whyItHurts: 'Manual WhatsApp communication at scale is time-consuming. Document collection through WhatsApp is disorganized. Reminder follow-ups are forgotten. Real but tolerated pain.',
  whyTheyMightPay: 'They might pay a small amount, but evidence suggests WTP ceiling is very low (₹500–₹1,000/month) and conservative buying behavior means sales cycles are long and attrition after initial purchase is high.',
  whyNow: 'The opportunity was more interesting 2 years ago before the WhatsApp Business API became more restrictive and before three similar products failed publicly.',
};

// ─── Opportunity #7 ────────────────────────────────────────────────────────────
// ROC/MCA Filing Assistant for Indian Startups
// Category: initially attractive but rejected — reach + WTP weak

const signals_007: EvidenceSignal[] = [
  {
    id: 's007-1',
    platform: 'Reddit',
    title: '"Got an MCA notice for not filing AOC-4. Didn\'t even know what that was."',
    author: 'u/startup_founder_ind',
    date: '2026-07-28',
    url: undefined,
    summary: 'First-time founder describing a surprise regulatory notice for missed ROC filing. 280 upvotes, many "me too" comments. Clear signal of a real problem — but on investigation, most founders say they fixed it by hiring a CS, not by using a tool.',
    signalType: 'complaint',
  },
  {
    id: 's007-2',
    platform: 'LinkedIn',
    title: '"MCA filing compliance for startups — what you actually need to file"',
    author: 'CS Neha Sharma',
    date: '2026-07-25',
    url: undefined,
    summary: 'Educational post listing annual filing requirements. 1,400 likes. Comments reveal that most startups either already have a CS on retainer or plan to hire one — not interested in a tool because "a CS is ₹15K/year, not worth risking it."',
    signalType: 'complaint',
  },
  {
    id: 's007-3',
    platform: 'Indie Hackers',
    title: '"Built MCA filing tracker — zero signups after 1 month"',
    author: 'IH user: compliance_founder',
    date: '2026-07-10',
    url: undefined,
    summary: 'Post-mortem from a founder who built a minimal MCA deadline tracker. Got 200 page views, 0 signups. Conclusion: "Founders outsource this to a CS the moment they incorporate. There is no self-service market here."',
    signalType: 'competitor-dissatisfaction',
  },
];

const scorecard_007: DetailedScorecard = {
  painSeverity: { score: 6, justification: 'Missed ROC filings result in penalties and notices. The problem is real. But most founders experience it once, get a CS, and it disappears from their mental stack — so the ongoing pain is low.' },
  frequency: { score: 3, justification: 'Annual or semi-annual. AOC-4, MGT-7, and AGM resolutions are once-per-year events. Extremely low frequency makes SaaS economics difficult.' },
  willingnessToPay: { score: 3, justification: 'CS professionals cost ₹10K–₹25K/year and handle all filings. Founders view this as cheaper and safer than a tool. Documented evidence (IH post-mortem) of zero signups even for a free tracker.' },
  founderFit: { score: 4, justification: 'CS compliance is a different domain from tax/finance. Would require either CS credentials or partnership with CS professionals who are the gatekeepers to this market.' },
  customerReach: { score: 2, justification: 'The fatal flaw. CS professionals are the gatekeepers. Founders who need this service go to a CS, not a tool. Reaching startup founders who would self-serve MCA filings requires finding people who are currently underserved by CSs — a small and shrinking set as legal-tech matures.' },
  speedToValidate: { score: 7, justification: 'A deadline tracker is simple to build. But the Indie Hackers post-mortem shows that even a free version got zero traction. Validation would quickly surface the reach problem.' },
  competitionIntensity: { score: 5, justification: 'CA Firms, IndiaFilings, Vakilsearch all offer MCA filing services. The tools market is thin because the demand funnels to service providers.' },
  platformRisk: { score: 8, justification: 'MCA portal API is government-controlled but reasonably stable. Low platform risk is one of the few positive attributes of this opportunity.' },
  defensibility: { score: 3, justification: 'No data moat. No network effects. CS professionals will always be the trusted alternative. Very low switching cost even if you captured a user.' },
  revenuePotential: { score: 3, justification: 'Even at ₹5K/year per customer, reaching 1,000 paying customers would require displacing a large portion of the CS market in startup compliance — essentially impossible against incumbents with relationship moats.' },
  overall: 4.8,
  weightedNote: 'REJECTED. Initially attractive because the regulatory pain is clearly real. Killed by two things: (1) customer reach score of 2 — CS professionals gatekeep this market, (2) WTP of 3 — founders see ₹15K CS retainer as cheaper and safer than any tool.',
};

const alternatives_007: CompetitiveAlternative[] = [
  { name: 'CS on retainer (₹10K–₹25K/year)', type: 'incumbent', gap: 'This is the preferred solution. CS professionals handle filings, attend AGMs, and take legal responsibility. A tool cannot replicate the liability coverage they provide.' },
  { name: 'IndiaFilings / Vakilsearch / LegalWiz', type: 'competitor', gap: 'Already sell MCA filing as a service. They are competing but have distribution through SEO and offline channels that a new entrant can\'t replicate cheaply.' },
  { name: 'DIY on MCA portal', type: 'workaround', gap: 'Founders who try this typically make errors, get notices, and then hire a CS. The negative experience reinforces the professional-service market.' },
];

const thesis_007: OpportunityThesis = {
  problem: 'Indian startup founders must file annual returns (AOC-4, MGT-7, AGM resolutions) with the Ministry of Corporate Affairs. Many miss deadlines due to unawareness, resulting in penalties and regulatory notices. A deadline tracker and guided filing assistant could prevent this.',
  whoExperiencesIt: 'Early-stage Indian startup founders (incorporated as Private Limited companies) in their first 1–2 years, before they establish a CS relationship.',
  whyItHurts: 'Penalties for late ROC filings accumulate at ₹100–₹500/day. A surprise notice from MCA creates anxiety. The problem is acute when it hits but is a one-time education event — not ongoing pain.',
  whyTheyMightPay: 'They might pay ₹2K–₹5K once to fix a problem. But the moment they engage a CS for anything else (equity structuring, shareholder agreements), the CS absorbs this compliance work too. There\'s no ongoing need for the tool once the CS relationship is established.',
  whyNow: 'This was a better idea before CS platforms (IndiaFilings, Vakilsearch) professionalized the space. Today, the path from "I got a notice" to "I hired a CS" is well-trodden and fast. The self-service market is smaller than it appears from Reddit complaint volume.',
};

// ─── Exported opportunity records ─────────────────────────────────────────────

export const OPPORTUNITIES: OpportunityRecord[] = [
  {
    id: 'opp-001',
    title: 'Indian Freelancer Tax & Compliance Stack',
    problemStatement: 'India\'s ~8M freelancers manage quarterly GST, advance tax, TDS collection, and ITR-4 across three government portals with no unified view — paying CAs ₹15K–₹40K/yr for largely mechanical work.',
    targetCustomer: 'Indian freelancers and consultants earning ₹10–₹60L/year',
    customerType: 'Indian SMB / Freelancer',
    status: 'validating',
    thesis: thesis_001,
    signals: signals_001,
    scorecard: scorecard_001,
    alternatives: alternatives_001,
    recommendation: 'Validate Now',
    recommendationReason: 'Strongest score in the pipeline. TaxSage distribution makes user interviews easy to schedule this week. The critical assumption (WTP) must be tested before building.',
    validationPlan: validationPlan_001,
    validationChecklist: validationChecklist_001,
    tags: ['Tax', 'Compliance', 'India', 'Freelancer', 'GST', 'Fintech'],
    discoveredAt: '2026-08-01',
    lastSeenAt: '2026-08-17',
    mode: 'demo',
  },
  {
    id: 'opp-002',
    title: 'AI Product Launch Readiness Review',
    problemStatement: 'Founders using Cursor/Claude to ship SaaS in days often launch with security vulnerabilities, exposed API keys, no privacy policy, and zero rate limiting — because AI assistants don\'t flag what they don\'t know to check.',
    targetCustomer: 'Solo AI founders shipping SaaS products with AI code generation',
    customerType: 'AI Founders',
    status: 'validate-now',
    thesis: thesis_002,
    signals: signals_002,
    scorecard: scorecard_002,
    alternatives: alternatives_002,
    recommendation: 'Validate Now',
    recommendationReason: 'Fast to validate as a manual service (no code required). Santosh is the exact customer. 5 manual reviews this week would give a clear go/no-go signal on WTP.',
    validationPlan: validationPlan_002,
    tags: ['Security', 'AI Founders', 'SaaS', 'Pre-launch', 'Compliance'],
    discoveredAt: '2026-08-07',
    lastSeenAt: '2026-08-16',
    mode: 'demo',
  },
  {
    id: 'opp-003',
    title: 'AI Agent Audit Trail & Human Approval Layer',
    problemStatement: 'Teams deploying AI agents in production have no standard way to audit what an agent did, replay decisions, require human approval before high-stakes actions, or generate a compliance report for enterprise buyers.',
    targetCustomer: 'B2B teams deploying AI agents for email, finance, and customer operations',
    customerType: 'AI Teams / Enterprise',
    status: 'investigating',
    thesis: thesis_003,
    signals: signals_003,
    scorecard: scorecard_003,
    alternatives: alternatives_003,
    recommendation: 'Investigate',
    recommendationReason: 'Real problem with enterprise demand signal. Customer reach is harder than other opportunities — requires direct network access to AI teams in production. Investigate before committing.',
    tags: ['AI Agents', 'Enterprise', 'Compliance', 'Human-in-the-loop', 'Audit'],
    discoveredAt: '2026-08-06',
    lastSeenAt: '2026-08-15',
    mode: 'demo',
  },
  {
    id: 'opp-004',
    title: 'Shopify + Razorpay + GST Reconciliation for Indian D2C',
    problemStatement: 'Indian D2C brands get different revenue numbers from Shopify, Razorpay, their bank, and the GST portal every month. Manual reconciliation in Excel takes 3–7 days per cycle and produces results no one fully trusts.',
    targetCustomer: 'Indian D2C founders and finance leads, ₹50L–₹5Cr monthly revenue',
    customerType: 'Indian D2C / E-commerce',
    status: 'investigating',
    thesis: thesis_004,
    signals: signals_004,
    scorecard: scorecard_004,
    alternatives: alternatives_004,
    recommendation: 'Investigate',
    recommendationReason: 'Solid market but higher build complexity than #1 and #2. Integration risk across 3 platforms is real. Need to verify WTP and confirm the "replace accountant" story before committing.',
    tags: ['D2C', 'Reconciliation', 'Shopify', 'Razorpay', 'GST', 'Finance'],
    discoveredAt: '2026-08-05',
    lastSeenAt: '2026-08-14',
    mode: 'demo',
  },
  {
    id: 'opp-005',
    title: 'DPDP Act Compliance Documentation Tool',
    problemStatement: 'Most Indian digital startups don\'t know what the Digital Personal Data Protection Act requires them to do, in what order, or how to produce the documentation enterprise buyers increasingly ask for in sales processes.',
    targetCustomer: 'Indian digital startups and B2B SaaS companies with enterprise buyers',
    customerType: 'Indian SaaS / B2B',
    status: 'watch',
    thesis: thesis_005,
    signals: signals_005,
    scorecard: scorecard_005,
    alternatives: alternatives_005,
    recommendation: 'Watch',
    recommendationReason: 'Real regulatory backing but low frequency and low defensibility limit the standalone opportunity. Monitor enforcement pace. Revisit if DPDP enforcement actions accelerate in H2 2026.',
    tags: ['DPDP', 'Privacy', 'Compliance', 'India', 'Legal', 'SaaS'],
    discoveredAt: '2026-08-05',
    lastSeenAt: '2026-08-12',
    mode: 'demo',
  },
  {
    id: 'opp-006',
    title: 'WhatsApp Chatbot Builder for CA/Tax Practices',
    problemStatement: 'India\'s 300K+ CA practices manage client relationships through WhatsApp manually. A purpose-built WhatsApp automation tool could handle appointment scheduling, document requests, and compliance reminders.',
    targetCustomer: 'Small CA and CS practices (1–5 professionals), India',
    customerType: 'CA / Professional Services',
    status: 'rejected',
    thesis: thesis_006,
    signals: signals_006,
    scorecard: scorecard_006,
    alternatives: alternatives_006,
    recommendation: 'Ignore',
    recommendationReason: 'Platform risk score of 2/10 is fatal. Three similar products failed in 18 months on WhatsApp API policy changes. Combined with low WTP (3/10) from conservative CA buyers, the risk/reward is unacceptable.',
    tags: ['WhatsApp', 'CA Practices', 'Automation', 'India', 'Platform Risk'],
    discoveredAt: '2026-07-20',
    lastSeenAt: '2026-08-02',
    mode: 'demo',
  },
  {
    id: 'opp-007',
    title: 'ROC/MCA Filing Assistant for Indian Startups',
    problemStatement: 'Many Indian startup founders miss annual MCA/ROC filing deadlines (AOC-4, MGT-7), receiving penalties and notices. A deadline tracker and guided filing assistant could prevent this.',
    targetCustomer: 'Early-stage Indian startup founders (Pvt Ltd) in first 1–2 years',
    customerType: 'Indian Startups',
    status: 'rejected',
    thesis: thesis_007,
    signals: signals_007,
    scorecard: scorecard_007,
    alternatives: alternatives_007,
    recommendation: 'Ignore',
    recommendationReason: 'Killed by customer reach (2/10) and WTP (3/10). CS professionals gatekeep this market. Documented IH post-mortem: zero signups for a free version. The self-service market does not exist at meaningful scale.',
    tags: ['MCA', 'ROC', 'Compliance', 'India', 'Legal', 'Startups'],
    discoveredAt: '2026-07-25',
    lastSeenAt: '2026-08-05',
    mode: 'demo',
  },
];

// ─── Radar overview stats (all DEMO) ──────────────────────────────────────────

export const RADAR_STATS = {
  lastScan: '2026-08-17T06:00:00Z',
  sourcesScanned: 7,
  totalDiscovered: 7,
  highConfidence: OPPORTUNITIES.filter((o) => o.scorecard.overall >= 7).length,
  currentlyValidating: OPPORTUNITIES.filter((o) => o.status === 'validating').length,
  nextScan: '2026-08-24T08:00:00Z',
} as const;
