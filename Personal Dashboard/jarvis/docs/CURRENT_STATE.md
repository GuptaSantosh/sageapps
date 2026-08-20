# Jarvis — Current State

> Update this file after every completed implementation or deployment milestone.
> Last updated: 2026-08-20 (persistence decision approved)

## What Is Complete

### Authentication (complete, verified in production)
- Auth.js v5 GitHub OAuth — single authorized user (numeric ID `8694772`)
- Three-layer defence: `proxy.ts` → `(private)/layout.tsx` → `requireAuth()`
- JWT session, 24h maxAge, fail-closed on missing config
- `callbackUrl` sanitization in login page (blocks external redirects and scheme injection)
- `next-auth` pinned exactly at `5.0.0-beta.32` (no `^`)

### Security (complete)
- CSP headers in `next.config.ts` (prod excludes `unsafe-eval`)
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
- `.gitignore` excludes all `.env*` files except `.env.example`
- `.env.example` documents all required vars including `AUTH_TRUST_HOST=true`

### DigitalOcean Deployment (complete, live at https://jarvis.sageapps.in)
- `jarvis` Linux user created, `/home/jarvis/`, nvm v0.40.5, Node 24.19.0
- Repo cloned to `/home/jarvis/sageapps/` (public GitHub clone, no auth needed)
- Production build: `npm run build -- --webpack` (Turbopack OOM-killed — always use webpack)
- Supervisor service `jarvis` — RUNNING, autostart, rotating logs at `/home/jarvis/logs/`
- nginx vhost `jarvis.sageapps.in`, proxying to `127.0.0.1:3000`
- Let's Encrypt TLS, expires 2026-11-18, auto-renewal registered
- All 5 existing Supervisor services (cleansage, finsage, mailsage-auth, mailsage-bot, taxsage) verified continuously running throughout

### Verified Production Behaviour
- `http://jarvis.sageapps.in/` → 301 → HTTPS
- `https://jarvis.sageapps.in/login` → 200, login page renders
- `https://jarvis.sageapps.in/` → 307 → `/login?callbackUrl=%2F`
- `.env.local` with real secrets in place on the server

## What Is Demo / Presentation Only

All of these display mock data and have no server-side persistence:

| Module | File | State |
|---|---|---|
| Opportunity Radar | `app/(private)/opportunities/page.tsx` | Client-only React state, resets on reload |
| Opportunity detail / lifecycle | `components/opportunities/opp-detail.tsx` | Session-only mutations |
| Opportunity data | `lib/opportunity-data.ts` | 7 hard-coded demo records |
| Radar agent run | `lib/agents/opportunity-radar.ts` | Simulated 3.2s delay, demo text output |
| Overview metrics | `app/(private)/page.tsx` | Demo badges (`DataState: 'demo'`) |
| Agents page | `app/(private)/agents/page.tsx` | Demo/mock |
| Projects page | `app/(private)/projects/page.tsx` | Demo/mock |
| Insights page | `app/(private)/insights/page.tsx` | Demo/mock |

## Step 5: Real Opportunity Radar

Goal: replace the demo Opportunity Radar with a genuine persistence-backed vertical slice. Santosh manually manages real opportunities. No AI evaluation or automated discovery yet.

### Ordered Progression for Step 5

1. **Persistence and lifecycle data** — opportunities survive reload; status transitions are durable
2. **Manual create and edit** — add new real opportunities; edit title, problem statement, thesis, customer
3. **Evidence URLs and research notes** — per-opportunity source URLs and freeform research notes
4. **AI-assisted evaluation** — Claude scores opportunities against the 10-dimension rubric
5. **Automated discovery and scheduled scans** — live source connectors (Reddit, IH, PH, X, etc.)

### Exact Next Action

**Implement the local persistence foundation only: dependencies, schema, generated initial migration and database connection. Do not connect the UI or change production yet.**

## Approved Persistence Decisions (2026-08-20)

All previously unresolved design questions are now closed:

| # | Decision | Status |
|---|---|---|
| 1 | **SQLite + `better-sqlite3` + Drizzle ORM** — approved | Approved |
| 2 | **Native module build readiness** — gcc 13, python 3.12, make, build-essential all confirmed on droplet; node-gyp v13.0.1 available via npx | Verified |
| 3 | **DB path** — `/home/jarvis/data/jarvis.db`; outside git tree; `/home/jarvis` owned by `jarvis:users`; deploy cannot touch it | Verified |
| 4 | **Seed behaviour** — production starts empty; fictional demo records must NOT be seeded | Approved |
| 5 | **Evidence URLs** — `opportunity_evidence` table (multiple per opportunity); required in V1 | Approved |
| 6 | **Research notes** — `opportunity_notes` table (multiple per opportunity, freeform); not limited to rejection/watch text | Approved |
| 7 | **Scorecard/recommendation** — nullable/optional; creating a real opportunity must not require AI evaluation fields | Approved |
| 8 | **Migration strategy** — explicit deploy step (`npx drizzle-kit migrate`) before restart; never automatic on startup | Approved |
| 9 | **Backup strategy** — use `better-sqlite3` `.backup()` API or SQLite `.backup` command (WAL-consistent online backup); never plain `cp` on a WAL-mode file | Approved |

## Operational Prerequisites (not yet executed)

These two server commands must be run before the first DB-backed application startup:

```bash
# SSH as root — one-time setup:
mkdir -p /home/jarvis/data && chown jarvis:users /home/jarvis/data && chmod 750 /home/jarvis/data
mkdir -p /home/jarvis/backups && chown jarvis:users /home/jarvis/backups && chmod 750 /home/jarvis/backups
```

`/home/jarvis/backups` and automated backups must be in place before meaningful real data is committed to the system.

## Deploy Reference

```bash
# MacBook → push
git add <files> && git commit -m "..." && git push   # use preconfigured Git auth — never put a token in a command or URL

# Server (SSH as root)
cd /home/jarvis/sageapps && git pull
npm ci                            # required if package.json changed or native modules added
npm run build -- --webpack
npx drizzle-kit migrate           # explicit migration step — only when schema changed; run before restart
supervisorctl restart jarvis

# Verify
supervisorctl status
curl -si https://jarvis.sageapps.in/ | head -5
```
