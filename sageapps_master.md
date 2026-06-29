# sageApps — Master Reference & Action Tracker
*Last updated: June 21, 2026 | Built with Claude*

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
- **Tech:** DigitalOcean Bangalore, supervisorctl, GitHub, Claude API

### Universe Engine (May 2026) — STABLE
- 4-track scoring system operational
- Track A: Magic Formula screen, 25 clean stocks (₹5,000Cr+ market cap)
  - Source: Screener.in Magic Formula export, uploaded monthly via /universeupdate
  - Exclusions: SPARC, GOKULAGRO, HINDCON (data distortions)
- Track C: 7 banks — HDFCBANK, ICICIBANK, KOTAKBANK, AXISBANK, SBIN, 
  INDUSINDBK, BANKBARODA
  - Scored on NPA/ROE/NIM/CASA/CAR
- Track D: 37 quality compounders, manually curated, annual review
- Track B: Parked — no fundamental data source yet

### Scoring engine fixes (May 2026)
- Scoring decoupled from momentum fetch — rescored=140 even when 
  Yahoo rate-limits
- Refreshscores handler fixed — was reading nested dict at wrong level
- Exclusion filter fixed — was reading from wrong config sub-key
- Universe purged of SME phantoms — down from 140 to 25 clean stocks

### Admin commands
- /adminrefresh — monthly wizard: Track C/D review + Track A upload prompt
  + auto-triggers refreshscores on completion
  + 30-day reminder cron if skipped
- /universeupdate — upload Screener.in Excel directly
- /refreshscores — background thread, non-blocking, ~7 min runtime

### Key commands (user-facing)
- /startpack — picks from Track A/C/D by conviction + risk profile
- /audit — portfolio health check with track labels
- /deploy — T1/T2 trigger-based deployment plan
- /brief — daily pre-market digest + portfolio briefing

### Current milestone
BLOCKER: 5 users opening daily briefings unprompted
This unlocks: external marketing, TradeSage build, ProductHunt prep

### Known issues / pending
- Track B empty — needs Screener QGLP/SMiLE upload wired to scoring
- Sector labels wrong for DMART, CHOLAFIN, TRENT in Track D JSON 
  (cosmetic, fix next monthly refresh)
- Failed: 78 stubs in universe JSON — will clear on next /universeupdate



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


#### CleanSage — 
#### CleanSage — Parked State (May 9 2026)
- Live at cleansage.sageapps.in ✅
- Storage breakdown accurate: Gmail ~10.5 GB, Photos ~80.4 GB, Drive 0.8 GB ✅
- Risk-tiered cleanup dashboard: Safe / Quick Wins / Review Carefully ✅
- Preview before delete working ✅
- Delete (move to trash) working end to end ✅
- Honest dashboard — no fake GB estimates ✅

PARKED — reason: Google One native cleanup covers core use case.
Pivot decision: Path 2 when returning — Photos intelligence
(duplicate detection, blurry photo flagging, WhatsApp forward detection)

KNOWN ISSUES (parked):
- Photos Library API returns 403 despite scope granted — 
  Photos size estimated via math (total - gmail - drive). Accurate enough.
- /review/bulk-senders 404 — route not built
- /review/drive and /review/photos routes not built
- Bulk senders cache: never caches empty result (fix pending)
- Force-refresh logic in api_bulk_senders (fix pending)

Current Debug State (May 6 2026)
- Live at cleansage.sageapps.in ✅
- OAuth working ✅
- Onboarding working ✅  
- Dashboard loads ✅
- gevent + monkey.patch_all() applied ✅

**BLOCKER:** get_large_attachments() returns 0 despite 
201 large attachments confirmed via direct API call.

Confirmed working:
- Direct requests call to Gmail API returns 201 messages
- get_storage_quota() works (91.97 GB used)
- get_spam_and_trash_size() works
- get_old_promotions() works

Root cause suspected: fields parameter or _get() silently 
swallowing errors in the per-message detail fetch loop.

Debug added: print statements in list call — not yet confirmed 
if debug output is visible.

User ID for testing: 4a832543-47f7-44a7-be12-6b0e37c90f50
Droplet: /home/cleansage/sageapps/cleansage/
Port: 5002

#### CleanSage

#### CleanSage — Current State (May 6 2026)
- Live at cleansage.sageapps.in ✅
- OAuth working ✅
- Dashboard loads with real data ✅
- get_large_attachments() fixed — pagination working, 113 results ✅
- get_storage_quota() fixed — 91.97 GB showing correctly ✅
- run_full_scan() wired: quota + spam/trash + large_attachments + old_promotions ✅

NEXT BLOCKER: /review/large-attachments route not found (404)
— route needs to be added to app.py

- **Status:** Live on DigitalOcean, single user testing (May 5 2026)
- **URL:** cleansage.sageapps.in
- **Value prop:** Gmail/Drive/Photos storage doctor — diagnose, 
  preview, clean in browser. No app install.
- **Price:** ₹199/mo or one-time ₹499 annual cleanup
- **Architecture:** Flask web app (not Telegram-first). 
  Telegram = companion alerts only.
- **Droplet path:** /home/cleansage/sageapps/cleansage/ 
  git-connected to GitHub ✅
- **Port:** 5002
- **Tech:** Flask, Google OAuth2 (Gmail+Drive+Photos scopes), 
  Claude API, gunicorn, nginx, supervisorctl
- **Files:** app.py, auth.py, gmail.py, drive.py, claude_api.py, 
  database.py, cache.py, signal_profile.py, tips.py, 
  telegram_bot.py, cron_scan.py
- **Key UX rule:** Always preview before delete. 
  Trash not permanent delete. Confirmation gate on every action.
- **Onboarding:** 6-question wizard → persona detection → 
  Smart Tips generated
- **Personas:** media_flood / promo_hoarder / drive_dumper / 
  even_spread
- **Signal Profile:** signal_profile.py (renamed from signal.py 
  to avoid Python built-in conflict)
- **Deploy flow:** same as MailSage — push MacBook → 
  pull droplet → supervisorctl restart cleansage

### CleanSage Signature Features (differentiators)
- Time-bucketed large attachment scan (5y+, 2-5y, recent)
- Save-before-delete: move to Drive/Photos before trashing
- Storage leak prevention via Smart Tips (not just cleanup)



### Known issues / pending fixes
- [ ] get_large_attachments() capped at 20 results — 
      needs pagination for real accounts
- [ ] get_bulk_senders() capped at 20 — needs smarter 
      grouping by sender domain
- [ ] run_full_scan() currently runs only 3 functions 
      (quota + spam/trash + old promotions) — 
      large attachments + bulk senders removed temporarily 
      due to gunicorn timeout issue. Add back with async 
      worker (gevent) or celery task queue
- [ ] Drive scan (drive.py) not yet wired into dashboard
- [ ] Photos scan not yet implemented
- [ ] Telegram companion bot not yet set up
- [ ] cron_scan.py weekly scan not yet activated
- [ ] Delete engine (Session 6) built but not tested
- [ ] Tips page (/tips) built but not validated end to end
- [ ] Switch gunicorn to gevent workers for long-running 
      API calls: add gevent to requirements.txt, 
      change supervisorctl command to add -k gevent

### supervisorctl
- service name: cleansage — RUNNING

### 🟡 BUILD NEXT (in order)

Priority order (May 2026):
1. FinSage — hit 5-user daily brief milestone (unlock for everything)
2. TaxSage — ITR season peaks July 31, 11 weeks away, start now
3. ExecSage — after FinSage milestone
4. TradeSage — after FinSage milestone  
5. CleanSage Photos — Path 2, duplicate/blurry detection
6. DocSage — lower urgency

#### CleanSage (new — added Apr 28), live on 5 may
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
- **Status:** Live at sageapps.in/taxsage. Two tools live: Regime Calculator + AIS Scanner.
- **Value prop:** ITR prep assistant, capital gains from CAS, tax-loss harvesting, Form 26AS check
- **Price:** Free during beta. Planned: ₹199–499/mo or ~₹299/year (peaks Jan–July)
- **Cross-app:** Automatically reads FinSage portfolio + MailSage CG statement emails (not yet built)
- **Competitors:** ClearTax, Quicko — neither has AI advisor layer

**Regime Calculator** — live, free forever
- Old vs new regime, correct FY 2025-26 math
- Employer NPS (both regimes) + personal NPS (old only, 80CCD 1B)
- HRA 3-way minimum, labour codes 50% basic assumption
- Meal coupons tax-free perquisite both regimes
- Salary slider ₹3L–₹2Cr + manual override
- Schedule AL flag >₹50L, ITR-3 flag for F&O

**AIS Scanner — live, June 2026**
- **Architecture:** Flask backend (taxsage-api) on droplet port 5003, separate from 
  static GitHub Pages frontend. Frontend form lives in taxsage/index.html.
- **Flow:** User uploads AIS PDF + enters PAN + DOB → password constructed as 
  `pan.lower() + dob(DDMMYYYY)` → pikepdf decrypts in memory → decrypted PDF sent 
  to Claude API as document block → Claude (claude-sonnet-4-6) returns structured 
  JSON flags → rendered as red/yellow/green cards on frontend.
- **No storage:** PDF, PAN, DOB never written to disk — memory only, discarded after response.
- **Files:** taxsage-api/app.py (Flask route, CORS removed — handled at nginx), 
  taxsage-api/ais_scanner.py (decrypt + Claude call + JSON parse), 
  taxsage-api/requirements.txt, taxsage-api/taxsage.conf (supervisorctl)
- **Deploy:** /home/taxsage/taxsage-api/ on droplet, git-connected, gunicorn -w 2 -t 120
- **nginx:** api.sageapps.in/taxsage-api/ → proxy to localhost:5003, 
  proxy_read_timeout 120s, CORS headers set at nginx level (not Flask-CORS — 
  caused silent failures, removed)
- **Flag categories covered:** Salary TDS-192, Dividend TDS-194/SFT-015, Business 
  receipts TDS-194C (misclassification detector), Foreign remittance TCS-206CQ, 
  Property TDS-194IA/SFT-012, Vehicle TCS-206CL, Savings/FD interest SFT-016, 
  Equity sales SFT-017, MF redemptions SFT-018, Inactive entries (any section), 
  Refunds B4, Tax payment challans B3
- **Validated against:** Founder's own real AIS (14 sections, 3 red/8 yellow/3 green) 
  — caught a real misfiled bank TDS entry (locker rent under 194C contractor code)

**Bugs fixed during build (reference for similar issues):**
- IT portal AIS JSON download is encrypted with non-standard crypto — 
  standard PBKDF2/CryptoJS approaches failed. Abandoned JSON input, PDF-only for V1.
- Gunicorn default 30s worker timeout killed requests mid-Claude-API-call → 
  fixed with `-t 120`
- nginx proxy_read_timeout defaulted to 60s, mismatched gunicorn's 120s → 
  504 Gateway Timeout. Both must match.
- Flask-CORS headers weren't reaching the browser through the nginx proxy → 
  removed Flask-CORS entirely, set CORS headers directly in nginx location block
- Error handling bug: frontend caught all non-200 responses as generic "Network 
  error" instead of surfacing the actual server error message — fixed to parse 
  JSON error body before throwing

**Known open items / not yet built:**
**Capital Gains Summary — Live (June 29 2026)**
- Zerodha Tax P&L (.xlsx), Kuvera PDF, CAMS Capital Gains PDF supported
- Debt MF gains separated — amber card, slab rate treatment (FA 2024)
- Kuvera + CAMS deduplication — no double counting
- Schedule CG reference card — exact ITR-2 row mapping (B1/B2/B5)
- STCG loss carry forward flagged with note
- Step-by-step guide anchor + email capture for future feature
- Known gap: dedup assumes CAMS is subset of Kuvera — warn user if CAMS-only

**Form 16 Analyser — Live (June 29 2026)**
- URL: sageapps.in/taxsage/form16.html
- Upload Form 16 PDF → salary summary, regime detection,
  deduction flags, TDS verification, filing guidance per schedule
- Regime-aware: new regime shows only 80CCD(2); old regime shows all VI-A deductions
- 80CCD(2) portal bug flagged — always shown as manual entry required with instructions
- Backend: /form16-summary route in taxsage-api, form16.py parser
- Known gap: no step-by-step ITR portal navigation — "coming soon" anchor live

- Pre-filing Checklist — Schedule FA (foreign assets), Schedule AL (assets >₹50L),
  dividend declarations, TDS mismatch summary
- Advance Tax Calculator — June 15/Sept 15/Dec 15/Mar 15 due dates, Telegram reminders
- Tax Harvest Alerts — Feb portfolio scan for LTCG exemption optimization
- AIS Scanner edge cases not yet tested: zero-entry AIS, F&O/business income sections, 
  multi-employer salary year, very large multi-page PDFs (timeout behavior beyond 120s)
- Paid tier not yet built — free regime calculator permanent, ~₹299/year for AIS 
  Scanner + future features, potential FinSage+TaxSage bundle
- Schedule FA paid one-off (₹99-249) — parked until user base exists, IndMoney/foreign 
  holdings exports identified as input source when this gets scoped

**Distribution (running in parallel, see separate session):**
- Reddit: r/personalfinanceindia post live, 17+ upvotes, no removal. Strategy — 
  pure value in post body (no link, avoids Rule 2 auto-flag), tool link added as 
  a comment after the post gains traction.
- Twitter: 5 tweets/week (Mon-Fri), rotating tip / story / result format, all 
  under 280 chars, all include sageapps.in/taxsage link. Scheduled via Buffer 
  free tier, set up Sundays.
- Avoided: generic "drop your SaaS" / "builders connect" threads — wrong 
  audience (other founders, not Indian taxpayers), engagement farming not 
  distribution.
- Target: 25 stranger scans by June 25 (tracked via `grep "POST /scan" 
  /var/log/taxsage.out.log` on droplet, GA on sageapps.in/taxsage)
- Urgency window: ITR filing deadline July 31 — TaxSage gets distribution 
  priority over FinSage/CleanSage until then.

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

### Static Site Deploy (sageapps.in)
sageapps.in (including /taxsage/) — GitHub Pages, auto-deploys on git push.
Webroot is NOT the droplet. Droplet (/var/www/sageapps.in) is NOT used for static site.

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
### Claude Code vs Claude Project — when to use which

- **Claude Project (this):** Architecture decisions, debugging diagnosis, 
  feature planning, master doc updates, prompt tuning, copy/messaging
- **Claude Code (terminal):** Actual file edits, git commits, 
  supervisorctl restarts, any change that touches the droplet or repo

### Claude Code prompt template
When Claude Project gives you a fix, run Claude Code like this:
"In [file path], [exact change description]. Make minimum change needed. 
Show me the diff. Then run [restart command]."

Never ask Claude Code to redesign — only execute what Claude Project scoped.

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
- Don't chase 100% storage accuracy via Gmail API — 
  ceiling is 60-70% with sampling. Google doesn't expose 
  Gmail/Photos split via API.
- Don't build CleanSage Photos until Google One shows its 
  limits with real users

## 9. Session Log

### Session: June 22 2026 — Capital Gains Summary Built, Two Bugs Caught and 
Fixed, ITR Detector + Lead Capture Shipped

Outcome: Capital Gains Summary live end-to-end at sageapps.in/taxsage, 
validated against founder's real Zerodha+Kuvera+CAMS files. ITR-type detector 
and email lead capture also shipped this session. Index page redesigned to 
3-tool layout.

Scoped before building (same pattern as AIS Scanner): confirmed equity-only 
scope, inspected real file structures (Zerodha xlsx sheet layout, Kuvera/CAMS 
PDF formats, ruled out IndMoney US holdings as out-of-scope/Schedule FA 
territory) before writing any parser code.

Built: capital_gains.py (Zerodha xlsx parser, Kuvera/CAMS PDF parser via 
Claude API, tax computation), new Flask route, frontend form + results UI, 
ITR-type rules engine on Regime Calculator, email-gate lead capture (SQLite, 
separate from scan data).

Bugs caught via manual validation (see TaxSage section for detail): STCG 
sign-loss bug, Kuvera equity/debt mixing bug. Both fixed and re-validated 
against source files before shipping.

Also discussed and explicitly parked: bank/UPI reconciliation aggregator 
(AA-regulated, different company-scale problem), AIS-to-S3 storage for 
"future customer use" (rejected outright — contradicts existing no-storage 
privacy claim, real exposure given pseudonym/conflict-of-interest 
constraint), crypto/GIFT City tax guide (real but niche, wait for demand 
signal), Schedule FA paid guide (real demand confirmed via research, ₹10L 
penalty fear driving CA spend — but wait for user base before building).

Distribution: two Reddit posts drafted (r/personalfinanceindia — capital 
gains reconciliation story; r/IndiaInvestments — Kuvera equity/debt mixing 
technical finding), 5 Twitter posts drafted, scheduled for evening window 
same day.

Next session: check Reddit/Twitter response, decide on lead-capture gate 
timing (upfront vs post-result) based on conversion data, validate ITR 
detector against more edge cases (NRI, multiple house properties), consider 
whether Pre-filing Checklist or Schedule FA paid guide is next build once 
user signal exists.

### Session: June 21 2026 — AIS Scanner Built, Shipped, Distribution Started

Outcome: AIS Scanner live end-to-end at sageapps.in/taxsage. Reddit + Twitter 
distribution running.

Built:
- Scoped AIS Scanner against founder's real AIS (5-page PDF, all sections read)
- Decided PDF-only input for V1 — IT portal JSON download uses non-standard 
  encryption, abandoned after multiple decryption attempts failed
- Wrote and validated Claude prompt (flag rules per AIS section, JSON output schema)
- Built taxsage-api Flask service: app.py + ais_scanner.py (pikepdf decrypt + 
  Claude API call + JSON parse)
- Deployed to droplet port 5003, supervisorctl-managed, git-connected
- nginx reverse proxy at api.sageapps.in/taxsage-api/
- Frontend upload form + flag card rendering added to taxsage/index.html

Bugs hit and fixed (in order):
1. CORS blocked — Flask-CORS headers not reaching browser through nginx proxy 
   → moved CORS handling to nginx location block, removed Flask-CORS
2. 500 error — gunicorn default 30s timeout killed worker mid Claude-API-call 
   → added `-t 120` to gunicorn command
3. 504 Gateway Timeout — nginx proxy_read_timeout still at 60s after gunicorn 
   fix → bumped to 120s to match

Validated: scanned founder's own AIS — 14 sections flagged (3 red/8 yellow/3 
green), correctly caught a real misclassified bank TDS entry (locker rent 
filed under 194C contractor code instead of correct section).

Page redesign:
- Restructured hero: "File your ITR with zero surprises" + "2 free tools live now" badge
- Added two-tool-card layout (Regime Calculator + AIS Scanner) above the fold
- Added sample scan output preview before the actual upload form
- Removed AIS Scanner / Regime Calculator from coming-soon grid (now live)
- Flattened gradient background, nav CTA changed to "Try free →"

Distribution started:
- Reddit r/personalfinanceindia: pure-value post (AIS mismatch story), 17+ 
  upvotes, no mod removal. Tool link added separately as a comment to avoid 
  Rule 2 auto-flag on self-promotion.
- Twitter: 5-tweet/week cadence drafted (tip/story/result rotation), all 
  under 280 chars, scheduled via Buffer
- Explicitly ruled out generic builder-community engagement-farming threads — 
  wrong audience for an Indian tax tool
- Second Reddit post queued for r/IndiaInvestments (capital gains AIS checklist)

Next session: scope Capital Gains Summary feature (Zerodha Tax P&L + 
Kuvera/CAMS upload → net LTCG/STCG + tax owed). Check stranger-scan count 
against June 25 target (25 scans) before deciding next feature priority.

### Session: June 10 2026 — TaxSage V1 Shipped + Distributed

Outcome: Full product live at sageapps.in/taxsage

Built:
- Regime calculator — correct FY 2025-26 tax math
- Employer NPS (both regimes) + personal NPS (old only)
- HRA 3-way minimum, labour codes 50% basic assumption
- Meal coupons as tax-free perquisite both regimes
- Salary slider ₹3L–₹2Cr + manual override
- Coming soon section — 6 feature cards with pain quotes
- Email capture wired to existing Google Form
- Google Analytics added to both pages
- Mobile layout fixed — inputs first, no sticky on mobile
- Nav hidden on mobile

Distributed:
- IIM batch WhatsApp — sent
- Twitter/X — posted, daily content plan set
- Reddit comment seeding — started

Results day 1:
- 4 Google Analytics visitors
- Comments asking for bots
- Reddit seeding started

Next build priority:
1. AIS Scanner — upload AIS, plain English flags per section
2. Capital Gains Summary — Zerodha + Kuvera upload → tax owed
3. Target: live before July 15

### Session 10 Jun 2026 - finsage
Macro overlay feature — shipped and tested (previous session carry)

Onboarding unification — Instructions 1-9 applied:
- Unified /start flow with returning user detection
- has_holdings() guard on all onboarding states  
- send_portfolio_setup() reusable module
- /setcash isolated state, no longer collides with onboarding
- /deploy and /portfolio use has_holdings() directly

Bugs found and fixed:
- set_onboarding_step() vs user["step"] direct assignment
- portfolio nested at user["portfolio"] not user root
- Local variable has_holdings shadowing module function (commit 29ff3bd)

Data incident:
- Diagnostic script wrote raw JSON bypassing encryption
- save_user() overwrote with empty holdings on next bot call
- Root cause: direct file access bypasses _encrypt() in database.py
- Fix: CLAUDE.md rule added — never touch user_*.json directly
- Recovery: portfolio reloaded via save_user() correctly

All commands verified working: /brief, /deploy, /portfolio, /setcash, /macro


### Session: May 31 2026 — TaxSage V1 Shipped

Outcome: Full product live at sageapps.in/taxsage

Built:
- Regime calculator (old vs new, correct tax math FY 2025-26)
- Employer NPS (both regimes) + personal NPS (old only) — correctly split  
- HRA 3-way minimum with labour codes 50% basic assumption
- Meal coupons as tax-free perquisite — both regimes
- Salary slider ₹3L–₹2Cr + manual override for higher salaries
- Schedule AL flag >₹50L, ITR-3 flag for F&O
- Coming soon section — 6 feature cards with pain quotes
- Email capture wired to existing Google Form waitlist
- Nav link, hero badge, card updated on sageapps.in
- Pricing: Free during beta (changed from wrong ₹199/month)

Distributed:
- IIM batch WhatsApp — sent
- Twitter/X — posted

Next session:
- Watch for first stranger email signup
- Watch WhatsApp responses for UX feedback  
- Build AIS Scanner if July 15 deadline is still target
- Update master doc in fresh chat

**Capital Gains Summary — live, June 2026**
- **Architecture:** Same taxsage-api Flask service (port 5003), new file 
  capital_gains.py, route POST /taxsage-api/capital-gains-summary
- **Inputs:** Zerodha Tax P&L (.xlsx, openpyxl cell read, no Claude call needed — 
  Zerodha pre-computes ST/LT split), Kuvera Capital Gains Statement (.pdf), 
  CAMS Capital Gain/Loss Statement (.pdf) — up to 3 files combined per request
- **Scope:** Equity only (stocks + equity MF). Debt fund gains shown as unlabeled 
  line, not taxed — debt is slab-dependent, deliberately out of v1 scope
- **Tax logic:** LTCG 12.5% above ₹1.25L exemption, STCG flat 20%, losses excluded 
  from tax (sign-aware)
- **No storage:** same memory-only pattern as AIS Scanner — PDFs, PAN, DOB never 
  written to disk
- **Validated against:** founder's own Zerodha + Kuvera + CAMS files for FY 2025-26. 
  Net LTCG ₹2,26,058, net STCG -₹29,891 (loss), tax owed ₹12,632 — confirmed by 
  hand against source documents

**Bugs found and fixed during build:**
- STCG sign bug: process() was dropping the negative sign on losses, taxing a 
  -₹29,891 short-term loss as if it were a ₹29,891 gain (would have charged 
  ₹5,978 tax on a loss). Fixed: tax only applied when net_stcg > 0.
- Kuvera equity/debt mixing bug: Kuvera's PDF headline "Long Term Capital Gains" 
  figure combines Equity Sub Total + Debt Sub Total. Extraction prompt was pulling 
  the combined number, overstating LTCG by the debt portion (₹16,769 in test case) 
  and incorrectly taxing debt gains at the equity 12.5% rate. Fixed: prompt now 
  extracts "Equity Sub Total" specifically. CAMS was unaffected — it already 
  separates Equity/Non-Equity into distinct summary sections.
- This is the third instance of the "silent wrong-data" pattern (after the AIS 
  194C misclassification catch and the FinSage refreshscores/exclusion-filter 
  bugs) — confirms manual validation against real source files before shipping 
  any data-extraction feature is non-negotiable, not optional.

**ITR-type detector — live, validated June 2026**
- Client-side JS, no API call, bolted onto Regime Calculator output
- Rules: ITR-1 (salary/pension, ≤₹50L, LTCG ≤₹1.25L, no foreign assets/F&O/biz), 
  ITR-2 (capital gains beyond ITR-1 threshold, multiple properties, foreign 
  assets, >₹50L), ITR-3 (any business/F&O income). Schedule AL flag >₹50L net 
  worth, Schedule FA flag if foreign assets
- Validated against founder's own profile — correctly returns ITR-2 given 
  real capital gains figures

**Lead capture — live, June 2026**
- Email-gate modal before AIS Scanner / Capital Gains Summary access, 
  sessionStorage flag prevents re-prompt same session
- Backend: new SQLite leads.db on taxsage-api (email, feature, created_at) — 
  separate from scan data, which remains memory-only/never stored
- Open question, not yet resolved: gate is mandatory-upfront (asks before any 
  value is shown), flagged as a possible friction risk against early Reddit 
  traffic — watch scan-to-visit ratio over the next week, consider moving to 
  post-result gate if conversion looks suppressed

**Index page — redesigned June 2026**
- 3-tool card layout (Regime Calculator, AIS Scanner, Capital Gains Summary), 
  all live, badge updated "2 free tools" → "3 free tools"
- Hero tightened, max-width 720px → 1060px, 2-col → 3-col, mobile breakpoint 
  updated to 700px

**Capital Gains Summary — live, June 2026**
- **Architecture:** Same taxsage-api Flask service (port 5003), new file 
  capital_gains.py, route POST /taxsage-api/capital-gains-summary
- **Inputs:** Zerodha Tax P&L (.xlsx, openpyxl cell read, no Claude call needed — 
  Zerodha pre-computes ST/LT split), Kuvera Capital Gains Statement (.pdf), 
  CAMS Capital Gain/Loss Statement (.pdf) — up to 3 files combined per request
- **Scope:** Equity only (stocks + equity MF). Debt fund gains shown as unlabeled 
  line, not taxed — debt is slab-dependent, deliberately out of v1 scope
- **Tax logic:** LTCG 12.5% above ₹1.25L exemption, STCG flat 20%, losses excluded 
  from tax (sign-aware)
- **No storage:** same memory-only pattern as AIS Scanner — PDFs, PAN, DOB never 
  written to disk
- **Validated against:** founder's own Zerodha + Kuvera + CAMS files for FY 2025-26. 
  Net LTCG ₹2,26,058, net STCG -₹29,891 (loss), tax owed ₹12,632 — confirmed by 
  hand against source documents

**Bugs found and fixed during build:**
- STCG sign bug: process() was dropping the negative sign on losses, taxing a 
  -₹29,891 short-term loss as if it were a ₹29,891 gain (would have charged 
  ₹5,978 tax on a loss). Fixed: tax only applied when net_stcg > 0.
- Kuvera equity/debt mixing bug: Kuvera's PDF headline "Long Term Capital Gains" 
  figure combines Equity Sub Total + Debt Sub Total. Extraction prompt was pulling 
  the combined number, overstating LTCG by the debt portion (₹16,769 in test case) 
  and incorrectly taxing debt gains at the equity 12.5% rate. Fixed: prompt now 
  extracts "Equity Sub Total" specifically. CAMS was unaffected — it already 
  separates Equity/Non-Equity into distinct summary sections.
- This is the third instance of the "silent wrong-data" pattern (after the AIS 
  194C misclassification catch and the FinSage refreshscores/exclusion-filter 
  bugs) — confirms manual validation against real source files before shipping 
  any data-extraction feature is non-negotiable, not optional.

**ITR-type detector — live, validated June 2026**
- Client-side JS, no API call, bolted onto Regime Calculator output
- Rules: ITR-1 (salary/pension, ≤₹50L, LTCG ≤₹1.25L, no foreign assets/F&O/biz), 
  ITR-2 (capital gains beyond ITR-1 threshold, multiple properties, foreign 
  assets, >₹50L), ITR-3 (any business/F&O income). Schedule AL flag >₹50L net 
  worth, Schedule FA flag if foreign assets
- Validated against founder's own profile — correctly returns ITR-2 given 
  real capital gains figures

**Lead capture — live, June 2026**
- Email-gate modal before AIS Scanner / Capital Gains Summary access, 
  sessionStorage flag prevents re-prompt same session
- Backend: new SQLite leads.db on taxsage-api (email, feature, created_at) — 
  separate from scan data, which remains memory-only/never stored
- Open question, not yet resolved: gate is mandatory-upfront (asks before any 
  value is shown), flagged as a possible friction risk against early Reddit 
  traffic — watch scan-to-visit ratio over the next week, consider moving to 
  post-result gate if conversion looks suppressed

**Index page — redesigned June 2026**
- 3-tool card layout (Regime Calculator, AIS Scanner, Capital Gains Summary), 
  all live, badge updated "2 free tools" → "3 free tools"
- Hero tightened, max-width 720px → 1060px, 2-col → 3-col, mobile breakpoint 
  updated to 700px

###Key Learnings & Principles ###
- **Multi-source data combination is where bugs hide, not single-source parsing:** 
  Zerodha parsing (deterministic cell reads) was clean on first pass. Both bugs 
  in Capital Gains Summary came from combining/interpreting PDF summary figures 
  (sign handling, equity/debt mixing) — extra scrutiny warranted whenever a 
  feature merges numbers across input sources rather than reading one cleanly 
  structured file.


### Session: June 29 2026 — Capital Gains FA2024 Compliance + Schedule CG

Outcome: Capital Gains Summary upgraded for FA 2024 compliance.
Schedule CG filing helper live.

Built:
- Debt MF separation in Kuvera parser — new 4-key Claude prompt
  (stcg_equity/ltcg_equity/stcg_debt/ltcg_debt)
- Kuvera + CAMS dedup logic — CAMS equity subtracted when both uploaded
- Multi-source aggregation validated: Zerodha + Kuvera + CAMS together
- Amber debt card on frontend — ₹16,769 shown with slab rate warning
- Schedule CG reference card — B1 (STCG), B2 (LTCG 112A), B5 (debt)
- STCG loss carry forward note
- Step-by-step guide anchor + email capture

Bugs fixed:
- Debt gains silently dropped (₹16,769 was missing from output)
- Double counting when Kuvera + CAMS both uploaded (DSP fund appeared twice)
- Wrong tax rate on debt (was using 12.5% equity rate, now slab rate)

Validated against founder's own files:
- Kuvera PDF: equity LTCG ₹43,164, debt LTCG ₹16,769 ✅
- Zerodha + Kuvera: STCG -₹29,891, LTCG ₹2,06,076, tax ₹10,134 ✅

Next session: Form 16 parser — salary pre-fill for ITR Schedule S


### Session: June 29 2026 (continued) — Form 16 Analyser

Built:
- form16.py — Claude-based PDF parser, extracts salary, deductions,
  TDS, regime, NPS details
- /form16-summary route in app.py — identical error handling to /capital-gains-summary
- taxsage/form16.html — full frontend, 5 result cards:
  Card A: Schedule S salary verification
  Card B: Regime detection (new/old, 115BAC)
  Card C: Schedule VI-A deductions — amber if manual entry needed
  Card D: Schedule TDS1 TDS verification
  Card E: Flags (surcharge, NPS portal bug, TDS shortfall)
- Form 16 link added to taxsage/index.html tool grid

Key decision: 80CCD(2) always flagged as manual_entry_required
for new regime — portal bug is widespread, not document-specific

Validated against founder's Form 16 FY 2025-26:
- Gross salary ₹96,15,647 ✅
- Net taxable ₹95,40,647 ✅
- New regime detected ✅
- TDS ₹26,93,217, TAN DELM17484F ✅
- 80CCD(2) ₹2,93,278 amber flag ✅ (after fix)
- Surcharge flag ✅

Personal filing note (founder):
- 80CCD(2) eligible amount shows ₹0 in ITR portal — delete and re-add
  with both fields set to ₹2,93,278 before filing
- This fix alone saves ~₹1L in tax

Next session options:
A. Tab navigation on taxsage hub (cosmetic, lower priority)
B. Advance Tax Calculator — Sept 15 deadline coming, rules-based build


Finsage
### Session 28 May 2026 (continued)
- Macro overlay feature shipped: macro_engine.py + macro_config.json
- /brief injection working (post-response append pattern)
- /macro command live — Pro+ only, free gate working
- Keyboard: /macro + /audit added
- Tier normalisation: .lower().strip() fix applied

###Session 28 May 2026
- Track A/B restored: 28 + 67 stocks
- Universe fully operational: 136 scored stocks across 4 tracks
- test_universe.py clean: 4 picks across C/D/A, NOT_SCORED=0
- Pending: Track B quality review (TIPSMUSIC etc — SME noise risk)

### Session: May 27 2026 — FinSage Test Suite + Data Fixes
Outcome: 13 tests added, 3 data bugs fixed, engine clean

Fixed:
- HDFCBANK/ICICIBANK/KOTAKBANK removed from compounders.json (Track D)
  Root cause: classify_stock() D>C priority was reading wrong conviction
- Regression test: test_banks_not_in_track_d protects all three

Tests added (219 → 232):
- 6 TestMonthlySipPlan (Direct-only, HIGH conviction injection)
- 3 TestPrompts Direct-over-Regular (briefing, lumpsum, rebalance)
- 4 TestUniverseEngine (bank regression, audit signals, 
  startpack conviction filter, deploy ranking)

Data state:
- Track C: 7 banks, fully scored ✅
- Track D: 34 compounders, rescored 34/34 ✅
- Track A/B: empty — needs /universeupdate + screener.in Excel

Next session: /universeupdate + Track B scoring pipeline



### Session: May 24 2026 — FinSage Full Command Validation
Duration: Half day
Outcome: All user-facing commands validated, 6 fixes shipped

Fixes shipped:
1. GESHIP added to Track A universe lookup in audit_portfolio()
2. /healthcheck alias added for /health
3. @aviraj_smile replaced with correct upgrade handle
4. Monthly plan — Direct-only rule added to all 4 prompts
   (briefing, monthly, lumpsum, rebalance, analyse)
5. Monthly plan — HIGH conviction underweight stocks now 
   injected into stock picks section
6. Monthly plan — audit_portfolio() wired into /monthly handler

Pending validation (cache issue):
- Monthly plan Direct-only rule — verify tomorrow morning
- HIGH conviction stocks in monthly picks — verify tomorrow morning

Next session start:
1. Confirm monthly plan fixes working (run /monthly fresh)
2. Build test suite — 6 test cases scoped
3. Track B scoring pipeline

### Session: May 23 2026 — FinSage Universe Engine Stabilisation
**Duration:** Full day
**Outcome:** Universe engine fully operational end-to-end

Fixes shipped:
1. Refreshscores handler — nested dict parsing bug
2. Scoring gate — decoupled from momentum fetch success
3. Track A universe — purged 140 SME phantoms, rebuilt with 
   25 Screener Magic Formula stocks (₹5,000Cr+ filter)
4. Startpack Track A/B disconnect — weight config now matches 
   pick logic
5. Exclusion filter — wrong config key, silently returning empty
6. /adminrefresh command — monthly wizard with cron reminder
7. /universeupdate — fixed single-sheet Excel support + 
   earnings yield derivation

Starting state: Rescored=0, Track A=phantom SMEs
Ending state: Rescored=60, clean picks, exclusions working

Next session focus: 
- Hit 5-user daily brief milestone (primary blocker)
- Track B scoring (QGLP/SMiLE upload → score pipeline)
- OR move to TaxSage if FinSage milestone reached