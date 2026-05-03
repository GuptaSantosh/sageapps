# sageApps — Master Reference & Action Tracker
*Last updated: April 28, 2026 | Built with Claude*

---

## 1. The Vision

**sageApps** is an umbrella of AI-powered personal and professional apps, each solving one high-frustration problem for Indian professionals. Each app is independent with its own value proposition, config, and pricing. A combined "Sage" tier unlocks cross-app intelligence.

**Domain:** Buy `sageapps.ai` (~₹5,400/year via GoDaddy). Avoid `.in` — it signals India-only.
**Tagline:** *"AI that knows what matters to you."*
**Core principle:** Every Sage app has a Signal Profile (personalizable config) that the user controls. AI applies default rules + user's custom rules. Users can update via Telegram menu or web UI. No silent updates — every config change is confirmed.

---

## 2. The Sage App Family

### 🟢 LIVE / BUILDING NOW

#### FinSage
- **Status:** Live on DigitalOcean, 12 users, Telegram bot
- **Value prop:** Daily portfolio briefing + Nifty signals, India-first
- **Price:** ₹299–799/mo
- **Milestone:** 5 users opening daily briefings unprompted. No marketing until it survives a Nifty down day cleanly.
- **Tech:** DigitalOcean Bangalore, supervisorctl, GitHub CI, Claude API, CLAUDE.md context
- **Key rule:** Claude explains, never decides trade amounts. Recommendation consistency = user trust.

#### MailSage
- **Status:** Artifact built (Claude.ai), sendPrompt flow working
- **Value prop:** Email triage, daily brief, hourly alerts, smart noise filter — India-context aware
- **Price:** ₹499–999/mo
- **Signal Profile:** Priority senders + alert keywords + noise filters. Persists via storage API.
- **Architecture:** User edits Signal Profile in artifact → clicks "Get Brief" → sendPrompt triggers Claude → Claude runs Gmail MCP → returns structured brief in chat
- **Feedback loop:** Post-brief voluntary checklist. User ticks off actioned items → teaches Signal Profile.
- **Competitor benchmark:** alfred_ $24.99/mo, Superhuman $30–40/mo. India pricing wins.
- **Next:** Port to FinSage Telegram bot as `/brief` command with 7AM cron.

### 🟡 BUILD NEXT (in order)

#### CleanSage (new — added Apr 28)
- **Problem:** Gmail storage full warnings, users frustrated but no time for 3-hour cleanup
- **Value prop:** Find and batch-delete junk emails, large attachments, duplicate Drive files, WhatsApp forward photos — with preview before any delete
- **Price:** ₹199/mo or one-time ₹499 annual cleanup
- **Key UX rule:** Always show "this will free X GB" preview. Never delete without confirmation.
- **Connectors:** Gmail + Google Drive + Google Photos MCP

#### TradeSage
- **Value prop:** AI trade signals, Zerodha/IndMoney execution with confirmation gate
- **Price:** ₹999–1,499/mo
- **Key rule:** Confirmation-gated always. "Jarvis wants to buy 50 Nifty Bees — confirm?" Never auto-executes.
- **Connectors:** Zerodha Kite API (wrap as custom MCP, ~1 day work), IndMoney API

#### ExecSage
- **Value prop:** Calendar prep, meeting briefings, follow-up drafts, task triage
- **Price:** ₹699/mo
- **Connectors:** Gmail + Google Calendar + Google Drive + Slack

#### DocSage
- **Value prop:** Upload any document → plain English summary + red flags (Form 16, CAS statement, loan agreement, RERA, offer letter)
- **Price:** ₹399/mo
- **Edge:** India-specific documents, privacy-first (no doc stored after processing)

#### TaxSage
- **Value prop:** ITR prep assistant, capital gains from CAS, tax-loss harvesting, Form 26AS check
- **Price:** ₹199–499/mo (peaks Jan–July)
- **Cross-app:** Automatically reads FinSage portfolio + MailSage CG statement emails
- **Competitors:** ClearTax, Quicko — neither has AI advisor layer

### 🔵 LATER

| App | Core value | Price |
|---|---|---|
| MeetSage | Transcribe calls → action items → auto follow-up | ₹299/mo |
| HealthSage | Upload labs → trends + doctor Q list | ₹199/mo |
| LearnSage | Daily 5-min briefs on topics you're learning | ₹149/mo |
| **Sage (combined)** | Cross-app intelligence bundle | ₹1,499/mo |

---

## 3. Architecture & Tech Principles

### Signal Profile (the config)
- Filename: `signal.json` (internal), called "Signal Profile" in UI
- Three buckets: `priority_senders`, `alert_keywords`, `noise_filters`
- Plus: `context_tags` (ongoing situations like "Vauld creditor"), `connected_apps`, `notification_channel`, `brief_time`
- Validation: Every save validates structure. If invalid → silent rollback to `last_good_state`. No crashes.
- Update channels: Telegram inline menu OR web UI chip editor. AI suggests updates based on behavior patterns.

### MCP Layer
- Each data source is a separate MCP server
- Agent code never changes — just register new connectors
- Currently connected: Gmail, Google Calendar, Google Drive
- Zerodha: Wrap Kite API as custom MCP server (~1 day of Claude Code work)
- All connectors: OAuth2 only, no password storage

### Cost Controls (non-negotiable from day 1)
- Free tier: 3 API calls/day, 24h lookback only
- Paid tier: 30 API calls/day, 30-day lookback, alerts, multi-app
- Cache briefs: Same date range within 60 mins → return cached, zero LLM cost
- Signal Profile filters client-side before API call: only matched emails hit Claude
- Result: ~₹0.50/user/day (free), ~₹5/user/day (paid). At 100 paid users: ₹15K cost vs ₹75K+ revenue.

### Security & Privacy
- OAuth2 only, tokens stored encrypted server-side
- Email bodies never logged
- LLM only sees metadata + first 200 chars of snippet (not full body unless needed)
- Signal profiles encrypted at rest
- On every screen: "Your emails never leave Anthropic's infrastructure and are never used to train models."

### Multi-user Architecture
- Same agent code, isolated per-user Signal Profile + OAuth tokens
- User A's data never visible to agent serving User B
- Onboarding: 10-question flow → auto-generates Signal Profile → connect Gmail → done in 5 mins

---

## 4. Where Paying Users Are (Forums + Acquisition)

### Validated by Reddit research (9,300+ posts analyzed, Jan 2026)
- **Finance tools = strongest willingness to pay** (pain score 85–90/100)
- **Productivity tools = most requests but weaker revenue signal**
- **Privacy-first apps rising** due to subscription fatigue

### Where your target users live

| Forum | What they want | Your app |
|---|---|---|
| r/IndiaInvestments | Portfolio tracking, MF alerts, tax calc | FinSage, TaxSage |
| r/personalfinanceindia | ITR, Form 26AS, CG statements | TaxSage, DocSage |
| r/IndianTechies | Productivity, AI tools, career | MailSage, ExecSage |
| r/zerodha | Trade alerts, position management | TradeSage |
| r/GMail | Inbox overload, storage full | MailSage, CleanSage |
| LinkedIn India (ED/VP/Director) | Executive productivity | ExecSage, MailSage |
| Zerodha TradingQnA | Kite API, algo trading interest | TradeSage |
| IndieHackers | Fellow builders — peer validation | All |
| ProductHunt | Early adopters globally | FinSage + MailSage launch |

### How to reach them (in order)
1. **Don't sell — share the problem.** Post on r/IndiaInvestments: "I built a Telegram bot that gives me a daily MF + Nifty brief — happy to share if anyone wants to try." No pitch, just utility.
2. **LinkedIn content** (you already do this at 3,699 impressions/week): one post showing a real FinSage brief screenshot (anonymized). "This is what my morning looks like now."
3. **Your IIM + S&P network** — free Elite access to first 20 people, ask for feedback in return. Already planned.
4. **ProductHunt launch** — FinSage first, then MailSage. Launch on a Tuesday morning IST.
5. **SEO long-term** — "best AI portfolio tracker India", "Gmail cleanup tool India", "ITR assistant AI" — these are low competition, high intent.

### Pricing strategy
- Start lower than you think (₹299–499 for first app). First 50 users are feedback, not revenue.
- Never offer lifetime deals — you'll regret it.
- Annual plan at 2 months free = reduces churn dramatically.

---

## 5. Feedback & Learning Loop

### Per-message feedback
- Every email card in brief: voluntary thumbs up/down (updates Signal Profile weighting)
- Post-brief checklist: 3–5 emails user confirms actioning (voluntary, never forced)
- After 3 ignores of same sender → bot asks "Add to noise list?"
- After feedback submitted → "Signal Profile updated: added X to noise, Y to priority"

### What feedback unlocks over time
- Week 1: Basic Signal Profile
- Month 1: AI knows your patterns (commute time, work hours, response style)
- Month 3: Proactive suggestions ("You usually action BSE emails on Tuesday morning — want me to highlight those first?")
- Month 6: The profile is deeply personal. Switching cost = months of learned context. **That's your moat.**

---

## 6. Conversation Consolidation Strategy

### The problem
Long Claude conversations = more tokens = slower, more expensive, context drift.

### The fix: Claude Projects
1. Create a **"sageApps"** Project in Claude.ai (left panel → Projects → New)
2. Set the project system prompt to a compressed version of this document (key decisions, current state, next actions)
3. Every new coding/planning session starts in the project — full context, fresh tokens
4. This document IS that compressed context

### What goes in project system prompt (paste this)
```
You are working with Santosh on sageApps — a family of AI Sage apps for Indian professionals.
Current apps: FinSage (live, 12 users, Telegram), MailSage (artifact built, sendPrompt flow).
Next: CleanSage, TradeSage, ExecSage, DocSage, TaxSage.
Domain: sageapps.ai. Tech: DigitalOcean, Python, Claude API, Telegram bot, MCP connectors.
Key constraint: Cost controls from day 1. Free tier = 3 API calls/day. Cache briefs. Signal Profile = user config.
Santosh prefers: direct feedback, no filler, constraints over options, one focus at a time.
Reference: [link to this doc in Drive]
```

---

## 7. Daily Action Plan (Start Here)

### This week
- [ ] Buy `sageapps.ai` domain (GoDaddy, ~₹5,400)
- [ ] Create "sageApps" Claude Project, paste compressed system prompt above
- [ ] Add `/brief` command to FinSage Telegram bot (reuse MailSage logic)
- [ ] Add 7AM IST cron job for auto-brief on FinSage

### Next week
- [ ] Port Signal Profile to FinSage server (`signal.json` per user)
- [ ] Add Telegram inline menu for signal profile editing (/settings command)
- [ ] Post on r/IndiaInvestments about FinSage — no pitch, just utility

### This month
- [ ] 5 FinSage users opening daily brief unprompted (current milestone)
- [ ] Free Elite access to 10 IIM/S&P contacts — collect structured feedback
- [ ] Scoping doc for CleanSage (Gmail storage cleanup)
- [ ] Start sageapps.ai landing page (single page, one app hero, waitlist)

### Next month
- [ ] CleanSage MVP (Gmail large attachment finder + batch delete with preview)
- [ ] MailSage on Telegram bot (port from Claude artifact)
- [ ] ProductHunt draft for FinSage launch

---

## 8. What Not To Do

- Don't combine apps into one bot "for simplicity" unless there's a clear cross-app use case
- Don't give free unlimited API access to any user
- Don't build TradeSage before FinSage hits the 5-user daily brief milestone
- Don't launch on ProductHunt before the app survives a Nifty down day (FinSage) or a high-email day (MailSage)
- Don't offer lifetime deals
- Don't build features without a real user asking for it first

