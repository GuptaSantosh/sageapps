/**
 * Opportunity Radar — mock implementation. [DEMO DATA]
 *
 * Future: replace mock with a real research pipeline that:
 *  1. Reads from configured sources (Reddit, Substack, PH, IH, YouTube, X)
 *  2. Clusters pain points by theme
 *  3. Calls claude-sonnet-4-6 to score each opportunity against the rubric
 *  4. Returns structured Opportunity[] with source references
 *
 * The scoring rubric and output format are intentionally designed here so
 * the real implementation just needs to fill in real data.
 */
import type { AgentResult, SourceRef } from '../types';

const DEMO_SOURCES: SourceRef[] = [
  { platform: 'Reddit', label: 'r/IndiaInvestments — "Freelancer GST filing is a nightmare" (847 upvotes)', observedAt: '2026-08-15' },
  { platform: 'Reddit', label: 'r/personalfinanceindia — Monthly thread: expense trackers keep dying', observedAt: '2026-08-16' },
  { platform: 'Indie Hackers', label: 'Show IH: "Built a rent agreement tool, 3K signups in 2 weeks"', observedAt: '2026-08-10' },
  { platform: 'Product Hunt', label: 'PH Discussion: Indian SaaS pricing — nobody solves the INR/USD problem', observedAt: '2026-08-12' },
  { platform: 'Twitter/X', label: '@fintech_india thread: "Every Indian freelancer dreads March"', observedAt: '2026-08-14' },
  { platform: 'YouTube', label: 'CA Rachana Ranade comments: 1200+ asking about TDS for consultants', observedAt: '2026-08-11' },
  { platform: 'Substack', label: 'The Ken: Indian gig economy compliance gap — estimated 8M affected', observedAt: '2026-08-08' },
];

const DEMO_OUTPUT = `OPPORTUNITY RADAR — Demo Scan   [DEMO DATA — not from live sources]
Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
Sources simulated: Reddit, Indie Hackers, Product Hunt, Twitter/X, YouTube, Substack

────────────────────────────────────────────────────────────────
#1  Indian Freelancer Tax & Compliance Stack           8.1 / 10
────────────────────────────────────────────────────────────────
Recommendation: VALIDATE NOW

Thesis: India has ~8M independent contractors who face a uniquely
painful compliance stack: quarterly GST filings, advance tax estimates,
TDS certificate collection from clients, and ITR-4 at year-end — each
requiring different portals with no unified view. Wallets pay CAs ₹15K-
₹50K/year for work that is largely mechanical. An AI-native compliance
co-pilot could own this workflow end-to-end.

Scores:
  Pain severity           ████████░░  8.0  Repeatedly called "the most
                                           stressful part of freelancing"
  Frequency               █████████░  9.0  Quarterly + monthly + annual
  Willingness to pay      ██████░░░░  6.0  Already paying CAs — substitution
  Founder fit             █████████░  9.0  FinSage + TaxSage + fintech background
  Customer reach          ███████░░░  7.0  LinkedIn, IIM alumni, Twitter/X
  Speed to validate       ████████░░  8.0  Landing page + 10 interviews in 1 week
  Competition (10=open)   ██████░░░░  6.0  ClearTax, Quicko have SMB focus
  Platform risk (10=safe) ████████░░  8.0  Govt API + Claude, no single dependency
  Defensibility           ██████░░░░  6.0  Data moat once users upload docs
  Revenue potential       ████████░░  8.0  ₹3K-8K/yr × 50K users = ₹15-40Cr ARR

Existing alternatives: ClearTax, Quicko, CA on Demand, LegalRaasta
Why they fall short: all require manual data entry; no AI copilot layer;
CA services are expensive; no proactive "here's what's due next week" flow

Sources:
• Reddit r/IndiaInvestments — "Freelancer GST filing is a nightmare" (847 upvotes)
• CA Rachana Ranade YouTube comments — 1,200+ asking about TDS for consultants
• The Ken: Indian gig economy compliance gap — estimated 8M affected

────────────────────────────────────────────────────────────────
#2  WhatsApp-Native Expense Tracker                   6.8 / 10
────────────────────────────────────────────────────────────────
Recommendation: INVESTIGATE

Thesis: Walnut shut down. Money Manager went paid. Every 6 months a
Reddit thread resurfaces asking "what expense tracker works in India?"
The pattern suggests a distribution problem, not a product problem.
WhatsApp has 500M+ Indian users — meeting people where they already are
could overcome the app-install drop-off that killed previous entrants.

Scores:
  Pain severity           ███████░░░  7.0
  Frequency               █████████░  9.0  Daily — every purchase
  Willingness to pay      █████░░░░░  5.0  Crowded free tier expectation
  Founder fit             ███████░░░  7.0  Mobile-first, API experience
  Customer reach          █████████░  9.0  WhatsApp → zero CAC
  Speed to validate       ████████░░  8.0  MVP: just a WA bot + spreadsheet
  Competition (10=open)   █████░░░░░  5.0  Several bots exist; low quality
  Platform risk (10=safe) ██████░░░░  6.0  WhatsApp Business API dependency
  Defensibility           █████░░░░░  5.0  Low switching cost
  Revenue potential       ██████░░░░  6.0  Ads or ₹99/mo premium tier

Existing alternatives: Fi, Niyo, Splitwise (partial), Jupiter
Why they fall short: require bank account linking (friction), no natural
language input, no WhatsApp interface

Sources:
• Reddit r/personalfinanceindia — Monthly thread: expense trackers keep dying
• Product Hunt comments: 3 failed Indian expense apps in 18 months

────────────────────────────────────────────────────────────────
#3  AI Rent Agreement Generator (India)               5.6 / 10
────────────────────────────────────────────────────────────────
Recommendation: WATCH

Thesis: Standard rent agreements cost ₹2-5K at a lawyer for a document
that is 90% boilerplate. Online templates are outdated, wrong state, or
miss registration clauses. An AI tool that generates state-specific,
legally current agreements could capture a real but narrow transaction.
Low frequency limits revenue ceiling.

Scores:
  Pain severity           ██████░░░░  6.0
  Frequency               █████░░░░░  5.0  Once per 1-2 years per user
  Willingness to pay      ████████░░  8.0  Already paying lawyers ₹2-5K
  Founder fit             ██████░░░░  6.0  Adjacent, not core
  Customer reach          ███████░░░  7.0  Housing sites, broker networks
  Speed to validate       █████████░  9.0  One-weekend build
  Competition (10=open)   ██████░░░░  6.0  LegalDesk, LegalZoom India
  Platform risk (10=safe) █████████░  9.0  No platform dependency
  Defensibility           ████░░░░░░  4.0  Easy to clone; IP thin
  Revenue potential       █████░░░░░  5.0  Low frequency caps ARR

Existing alternatives: LegalDesk, IndiaFilings, LegalZoom India
Why they fall short: template-based, no state law updates, no AI review

Sources:
• Indie Hackers: "Built a rent agreement tool, 3K signups in 2 weeks"
• Twitter/X: multiple threads on rent agreement confusion

────────────────────────────────────────────────────────────────
#4  SaaS Pricing Page Calculator for Indian B2B       4.2 / 10
────────────────────────────────────────────────────────────────
Recommendation: IGNORE

Thesis: Indian B2B SaaS founders struggle with INR vs USD pricing —
underpricing for global and overpricing for domestic. Niche problem
with a small addressable market at seed/Series A stage; SaaSBoomi and
Twitter communities solve it informally through peer advice already.

Scores:
  Pain severity           █████░░░░░  5.0
  Frequency               ████░░░░░░  4.0
  Willingness to pay      ████░░░░░░  4.0
  Founder fit             ███████░░░  7.0
  Customer reach          █████░░░░░  5.0
  Speed to validate       ████████░░  8.0
  Competition (10=open)   ███░░░░░░░  3.0  Community advice is free
  Platform risk (10=safe) █████████░  9.0
  Defensibility           ███░░░░░░░  3.0
  Revenue potential       ████░░░░░░  4.0

Sources:
• Product Hunt discussion: Indian SaaS pricing threads
• SaaSBoomi community: recurring pricing questions

────────────────────────────────────────────────────────────────
SUMMARY
  Validate Now  →  #1 Indian Freelancer Tax Stack
  Investigate   →  #2 WhatsApp Expense Tracker
  Watch         →  #3 Rent Agreement Generator
  Ignore        →  #4 SaaS Pricing Calculator

Next step: Run /brief validate on #1 — schedule 10 user interviews.
────────────────────────────────────────────────────────────────
[DEMO DATA — scores, quotes, and source citations are illustrative.
 Real data requires live source connectors — not yet wired.]`;

export async function runOpportunityRadar(_params: Record<string, string>): Promise<AgentResult> {
  // Simulate research processing time
  await new Promise((res) => setTimeout(res, 3200));

  return {
    success: true,
    output: DEMO_OUTPUT,
    runId: crypto.randomUUID(),
    completedAt: new Date().toISOString(),
    sources: DEMO_SOURCES,
  };
}
