# Jarvis — Current State

> Update this file after every completed implementation or deployment milestone.
> Last updated: 2026-08-21 (Step 5.3 core UI connected to database — create/edit live, lifecycle/checklist/evidence/notes deferred)

## What Is Complete

### Step 5.3 — Core UI connected to database (complete, committed pending)

Build, TypeScript, lint (0 errors), `npm audit --omit=dev` (0 vulnerabilities) all pass.
Dev DB migration applied and create/update/delete cycle verified; no test data remains.

| File | Change |
|---|---|
| `app/(private)/opportunities/page.tsx` | Replaced with thin Server Component; calls `listOpportunities()` directly and renders `<OpportunitiesClient>` |
| `components/opportunities/opportunities-client.tsx` | New client component — status filter pills, title/date sort, live stats strip (total/validate-now/validating), table rows from `OpportunityRow`, polished empty state, create form inline, selected-row detail panel with edit toggle |
| `components/opportunities/opportunity-form.tsx` | New client component — create and edit form; `useTransition` for pending state; calls `createOpportunityAction` / `updateOpportunityFieldsAction`; `router.refresh()` on success |

**User-visible behaviour:**
- Page loads with real database records (empty state when none exist)
- "New Opportunity" button opens inline create form with title, problem statement, target customer, customer type, discovered-on date, tags
- Clicking a row opens a detail panel; "Edit" shows the edit form pre-filled
- Status filter pills show live counts; title and date sort work
- Tags rendered as inline chips in table rows and detail panel
- AI-era fields (recommendation, etc.) shown in the detail panel only when non-null
- Demo banner removed; demo data not displayed

**Not yet connected (deferred to Step 5.4):**
- Lifecycle status transitions (the `OppDetail` component and its `TRANSITIONS` map)
- Validation checklist
- Evidence URLs and research notes

**Known concerns:**
- `lib/opportunity-data.ts` (7 fictional records) and `lib/agents/opportunity-radar.ts` (mock simulation) are unused by the live data path but retained as reference; the "Run Radar" button still runs the client-side simulation only.
- `OppDetail` component is still imported nowhere in the live path; it compiles but is disconnected.

### Step 5.2 — Server-side data and mutation layer (complete, committed dbd3a76)

Build, TypeScript, lint (0 errors) and `npm audit --omit=dev` (0 vulnerabilities) all pass.
Disposable local migration verified cleanly; test DB removed. UI unchanged — still client-side React state.

| File | Content |
|---|---|
| `lib/db/queries.ts` | Pure DB layer: `listOpportunities`, `getOpportunity`, `getEvidence`, `getNotes`, `getChecklist`, `createOpportunity`, `updateOpportunityFields`, `updateOpportunityStatus` (atomic tx), `updateChecklist`, `addEvidence`, `removeEvidence`, `addNote`, `removeNote`. Exports `ALLOWED_TRANSITIONS` map. |
| `app/(private)/opportunities/actions.ts` | Server Actions: `createOpportunityAction`, `updateOpportunityFieldsAction`, `updateOpportunityStatusAction`, `updateChecklistAction`, `addEvidenceAction`, `removeEvidenceAction`, `addNoteAction`, `removeNoteAction`, `listOpportunitiesAction`, `getOpportunityAction`. All call `requireAuth()`, validate with Zod 4, return `ActionResult<T>`, call `revalidatePath('/opportunities')`. |
| `package.json` / `package-lock.json` | `zod@4.4.3` added to `dependencies`. |
| `lib/db/index.ts` | Removed unnecessary `eslint-disable` comment (no-var rule not active for `declare global`). |

**Design notes:**
- `updatedAt` is set explicitly on every mutation; no DB trigger.
- `updateOpportunityStatus` does all writes (status + checklist provisioning + optional note) in a single `db.transaction()`.
- Checklist limits enforced in Zod: `conversationsCompleted` 0–5, `problemConfirmed` 0–3, `solutionRequested` 0–2; booleans 0–1.
- Evidence URLs must match `http://` or `https://` (Zod `.refine()`).
- `requireAuth()` is called outside try/catch so Next.js `redirect()` propagates correctly.
- Tags serialized as JSON strings in DB; deserialized at the UI layer.
- `crypto.randomUUID()` used for all IDs (Node 24 built-in).

**Known concerns:**
- `updatedAt` on `opportunity_notes` and `opportunities` is not auto-updated by SQLite; callers must set it. Query helpers do this.
- Status/signal-type enum values still enforced only at Zod layer, not DB CHECK constraints (intentional V1 design decision).

### Step 5.1 — Persistence Foundation (complete, committed ebbf2fa)

All files implemented locally. Build and TypeScript both clean. UI unchanged — Opportunity Radar still runs on client-side React state.

| File | Status |
|---|---|
| `lib/db/schema.ts` | Four tables: `opportunities`, `opportunity_evidence`, `opportunity_notes`, `validation_checklist` |
| `lib/db/index.ts` | Lazy singleton `getDb()` — WAL mode, foreign keys, server-only, HMR-safe, prod fail-closed |
| `drizzle.config.ts` | Drizzle Kit config — reads `JARVIS_DB_PATH`, falls back to `data/jarvis.dev.db` in dev |
| `migrations/0000_stale_micromax.sql` | Initial SQL migration — all 4 tables, FK constraints, indexes |
| `.gitignore` | Added: `data/`, `*.db`, `*.db-wal`, `*.db-shm` |
| `.env.example` | Added `JARVIS_DB_PATH` with full operational instructions |
| `package.json` | Added scripts: `db:generate`, `db:migrate`, `db:studio` |

**Audit note**: `drizzle-kit@0.31.10` has 4 moderate vulns via `esbuild <=0.24.2` (GHSA-67mh-4wv8-2f99). Dev-only (esbuild dev server). Downgrade fix would require `drizzle-kit@0.18.1` (breaking). No action taken — track for future drizzle-kit upgrade.

**Operational prerequisites still pending** (must be done before first DB-backed production startup):
```bash
# SSH as root — one-time:
mkdir -p /home/jarvis/data && chown jarvis:users /home/jarvis/data && chmod 750 /home/jarvis/data
mkdir -p /home/jarvis/backups && chown jarvis:users /home/jarvis/backups && chmod 750 /home/jarvis/backups
```

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
| Opportunity Radar list + create/edit | `app/(private)/opportunities/page.tsx` + `opportunities-client.tsx` | **Live — real SQLite data** |
| Opportunity detail / lifecycle | `components/opportunities/opp-detail.tsx` | Disconnected from live path; deferred to Step 5.4 |
| Opportunity data | `lib/opportunity-data.ts` | 7 hard-coded demo records — not displayed; retained as reference |
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

**Step 5.4 — Lifecycle transitions in the UI.**

Wire the existing `OppDetail` component (or a new detail panel) to the server actions:
1. Connect lifecycle status transition buttons to `updateOpportunityStatusAction`.
2. Connect validation checklist fields to `updateChecklistAction`.
3. Add evidence panel: list existing evidence rows (from `getEvidence`), add via `addEvidenceAction`, remove via `removeEvidenceAction`.
4. Add notes panel: list notes (from `getNotes`), add via `addNoteAction`, remove via `removeNoteAction`.
5. Consider retiring or repurposing `OppDetail` component — it targets the old `OpportunityRecord` type, not `OpportunityRow`.
6. Once all references to `lib/opportunity-data.ts` and `lib/agents/opportunity-radar.ts` are gone, delete them.

Production starts empty — do not seed demo data.

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
