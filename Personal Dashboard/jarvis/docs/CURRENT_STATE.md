# Jarvis — Current State

> Update this file after every completed implementation or deployment milestone.
> Last updated: 2026-08-20

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

**Read-only verification of DigitalOcean prerequisites before approving persistence technology.**

Specifically, verify on the droplet before writing any code:
1. `build-essential` and `python3` present (required for native module compilation)
2. `node-gyp` can compile a native addon (`npm install better-sqlite3` test or equivalent)
3. Confirm `/home/jarvis/data/` can be created and is writable by the `jarvis` user
4. Confirm the directory survives a `supervisorctl restart jarvis` without being cleared

Only after those checks pass, approve the persistence technology and proceed to implementation.

## Unresolved Design Decisions

These must be answered before implementation begins:

| # | Question | Status |
|---|---|---|
| 1 | **SQLite/better-sqlite3/Drizzle recommended but not approved** — native module prerequisite unverified on the droplet | Unresolved |
| 2 | **Native module compatibility on the droplet** — does `build-essential`/`python3`/`node-gyp` work? Alternative: `@libsql/client` local file mode (pure JS, no compile) | Unverified |
| 3 | **Production database path and permissions** — proposed `/home/jarvis/data/jarvis.db` (outside git repo) must be verified writable by `jarvis` user | Unverified |
| 4 | **Seed behaviour** — should the 7 demo records seed the production DB, or should production start empty? Preference is to start empty (no demo records in production) | Decision needed |
| 5 | **Manual evidence/source URLs** — V1 must support adding real source URLs per opportunity (currently `url?: string` is always `undefined` in demo data) | Required in V1 |
| 6 | **Research notes** — must support genuine freeform notes per opportunity, not only the limited rejection-reason/watch-note text currently in `oppNotes` state | Required in V1 |
| 7 | **Scorecard and recommendation fields** — these are AI-generated in the intended design; in V1 they should be optional/nullable until AI evaluation is wired, not required on manual creation | Design decision |
| 8 | **Migration execution during deploy** — run `drizzle-kit migrate` in `start.sh` before `next start`, or as a separate deploy step? Tradeoff: automatic safety vs. slower startup | Undecided |
| 9 | **Backup approach** — proposed: daily `cp jarvis.db jarvis-YYYYMMDD.db` cron under `jarvis` user | Undecided |

## Deploy Reference

```bash
# MacBook → push
git add <files> && git commit -m "..." && git push   # use preconfigured Git auth — never put a token in a command or URL

# Server (SSH as root)
cd /home/jarvis/sageapps && git pull
npm ci                            # only if package.json changed or native modules added
npm run build -- --webpack
supervisorctl restart jarvis

# Verify
supervisorctl status
curl -si https://jarvis.sageapps.in/ | head -5
```
