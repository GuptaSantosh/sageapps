# sageApps — Master Reference & Action Tracker
*Last updated: May 4, 2026 | Built with Claude*

---

## 1. The Vision

**sageApps** is an umbrella of AI-powered personal and professional apps, each solving one high-frustration problem for Indian professionals. Each app is independent with its own value proposition, config, and pricing. A combined "Sage" tier unlocks cross-app intelligence.

**Domain:** sageapps.in (live, GitHub Pages). sageapps.ai still to buy (~₹5,400/year via GoDaddy).
**Tagline:** *"AI that knows what matters to you."*
**Core principle:** Every Sage app has a Signal Profile (personalizable config) that the user controls. AI applies default rules + user's custom rules. Users can update via Telegram menu or web UI. No silent updates — every config change is confirmed.

---

## 2. The Sage App Family

### 🟢 LIVE / BUILDING NOW

#### FinSage
- **Status:** Live on DigitalOcean, 12 users, Telegram bot @FinSageAI_bot
- **Value prop:** Daily portfolio briefing + Nifty signals, India-first
- **Price:** ₹299–799/mo
- **Milestone:** 5 users opening daily briefings unprompted. No marketing until it survives a Nifty down day cleanly.
- **Tech:** DigitalOcean Bangalore, supervisorctl, GitHub, Claude API
- **Droplet path:** check with `supervisorctl cat finsage` — not yet git-connected
- **Key rule:** Claude explains, never decides trade amounts. Recommendation consistency = user trust.

#### MailSage
- **Status:** Live on DigitalOcean, Telegram bot @MailSageAI_bot, single user testing (May 3 2026)
- **Status:** Beta-ready, May 4 2026. External users starting.
- **Value prop:** Email triage, daily brief, date-range briefs, smart noise filter — India-context aware
- **Price:** ₹499–999/mo
- **Signal Profile:** Priority senders + alert keywords + noise filters. Persists via data/{user_id}_user.json
- **Architecture:** Telegram bot (bot.py) + Flask OAuth server (auth_server.py) + nginx SSL on api.sageapps.in. Gmail OAuth2 per user. Claude summarises via claude_api.py. Caching via cache.py (60 min TTL).
- **Files:** bot.py, auth_server.py, gmail.py, claude_api.py, database.py, cache.py, keyboard.py, cron_brief.py
- **Commands:** /brief, /brief 7, /brief 3may, /brief 3may 10may, /brief refresh, /auth, /settings, /add_priority, /add_keyword, /add_noise, /set_time, /help
- **Features done:** Gmail OAuth multi-user, Signal Profile, 60min cache, date ranges, 7AM IST auto-brief cron, keyboard buttons, BotFather menu, conversation state for multi-step commands, stats header with noise ratio logic (hidden if <30% filtered), security alerts in ⚡ not 🔴
- **Droplet path:** /home/mailsage/mailsage/ — git connected to GitHub ✅
- **Next:** Use daily for 5-7 days, tune prompt, first external user

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

### GitHub Repo (GuptaSantosh/sageapps) — Public
```
sageapps/
├── sageapps_master.md       ← project brain, version controlled
├── index.html               ← sageapps.in landing page (GitHub Pages)
├── CNAME                    ← sageapps.in domain mapping
├── .gitignore               ← .env, credentials.json, data/, logs/, venv/
├── mailsage/                ← real code, pushed May 4 2026 ✅
│   ├── bot.py, auth_server.py, gmail.py, claude_api.py
│   ├── database.py, cache.py, keyboard.py, cron_brief.py
│   └── .env.example
├── finsage/                 ← code present, not yet git-connected on droplet
└── cleansage/               ← placeholder only
```

### DigitalOcean Droplet (134.209.144.250, Bangalore)
```
/home/mailsage/mailsage/     ← MailSage live, git-connected ✅
    .env                     ← secrets, never in GitHub
    credentials.json         ← secrets, never in GitHub
    data/                    ← user data, never in GitHub
    venv/                    ← Python env, never in GitHub

/home/finsage/? (check)      ← FinSage live, not yet git-connected
```

### Deploy Flow (MailSage)
```bash
# MacBook: edit → push
git add . && git commit -m "fix: ..." && git push

# Droplet: pull → restart
cd /home/mailsage/mailsage && git pull && supervisorctl restart mailsage-bot mailsage-auth
```

### supervisorctl services
- `finsage` — RUNNING (uptime 10+ days)
- `mailsage-bot` — RUNNING
- `mailsage-auth` — RUNNING

### Signal Profile (the config)
- Filename: `signal.json` (internal), called "Signal Profile" in UI
- Three buckets: `priority_senders`, `alert_keywords`, `noise_filters`
- Plus: `context_tags`, `connected_apps`, `notification_channel`, `brief_time`
- Validation: Every save validates structure. If invalid → silent rollback to `last_good_state`. No crashes.
- Update channels: Telegram inline menu OR web UI chip editor.

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
2. **LinkedIn content** (3,699 impressions/week): one post showing a real FinSage brief screenshot (anonymized).
3. **Your IIM + S&P network** — free Elite access to first 20 people, ask for feedback in return.
4. **ProductHunt launch** — FinSage first, then MailSage. Launch on a Tuesday morning IST.
5. **SEO long-term** — "best AI portfolio tracker India", "Gmail cleanup tool India", "ITR assistant AI".

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

## 6. Conversation & Session Strategy

### Claude Project setup
- Project: "sageApps" in Claude.ai
- System prompt: compressed context below
- Rule: New day = new chat. Same day, same task = continue. Switching apps = new chat.
- Always start new chat with updated sageapps_master.md uploaded

### Code editing rules (token efficiency)
- Use str_replace style edits — changed function only, not full file
- Full file rewrites only when 3+ functions change simultaneously
- Single line changes via sed commands

### What goes in project system prompt
```
You are working with Santosh on sageApps — a family of AI Sage apps for Indian professionals.
Current apps: FinSage (live, 12 users, @FinSageAI_bot), MailSage (live, @MailSageAI_bot, single user testing).
Next: CleanSage, TradeSage, ExecSage, DocSage, TaxSage.
GitHub: github.com/GuptaSantosh/sageapps (public monorepo).
Droplet: 134.209.144.250 (DigitalOcean Bangalore). MailSage at /home/mailsage/mailsage/, git-connected.
Tech: Python, Telegram bots, Claude API, supervisorctl, nginx, GitHub Pages for landing.
Key constraint: Cost controls from day 1. Free tier = 3 API calls/day. Cache briefs. Signal Profile = user config.
Santosh prefers: direct feedback, no filler, constraints over options, one focus at a time.
```

---

## 7. Action Plan

### Done ✅
- sageapps.in live (GitHub Pages)
- MailSage live on Telegram (@MailSageAI_bot), single user testing
- GitHub monorepo set up (GuptaSantosh/sageapps)
- MailSage real code pushed to GitHub
- Droplet /home/mailsage/mailsage/ git-connected to GitHub
- Deploy flow established (push on MacBook → pull on droplet → restart)
- sageapps_master.md in GitHub repo ✅

- MailSage cron lock, timeout, numbered brief, bold sender
- MailSage persona picker (4 personas + custom)
- MailSage /reset, /admin, feedback buttons
- MailSage welcome /start message
- MailSage expanded keyboard (7 buttons)
- index.html: MailSage live, Telegram link, founder bio, levelsio removed
- sageapps.ai domain purchased

### This week
- [ ] First external user on MailSage

- [ ] Connect FinSage droplet path to GitHub (when ready)
- [x] Use MailSage daily — tune Claude prompt ✅
- [x] Push updated sageapps_master.md to GitHub ✅
- [x] Buy sageapps.ai domain ✅

### Next week
- [ ] Post on r/IndiaInvestments about FinSage — no pitch, just utility
- [ ] Port Signal Profile to FinSage server (signal.json per user)
- [ ] Add Telegram inline menu for FinSage signal profile (/settings)

### This month
- [ ] 5 FinSage users opening daily brief unprompted
- [ ] Free Elite access to 10 IIM/S&P contacts — structured feedback
- [ ] Scoping doc for CleanSage
- [ ] Buy sageapps.ai domain

### Next month
- [ ] CleanSage MVP (Gmail large attachment finder + batch delete with preview)
- [ ] ProductHunt draft for FinSage launch

---

## 8. What Not To Do

- Don't combine apps into one bot "for simplicity" unless there's a clear cross-app use case
- Don't give free unlimited API access to any user
- Don't build TradeSage before FinSage hits the 5-user daily brief milestone
- Don't launch on ProductHunt before the app survives a Nifty down day (FinSage) or a high-email day (MailSage)
- Don't offer lifetime deals
- Don't build features without a real user asking for it first
