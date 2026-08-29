# Jarvis — Current State

> Update this file after every completed implementation or deployment milestone.
> Last updated: 2026-08-28 (Step 6.0 — rubric doc committed; dead-code cleanup pending)

## What Is Complete

### Opportunity Radar V1 — Production Launch (deployed 2026-08-23, commit ef7eaa6)

**Status: PRODUCTION-COMPLETE.** The persistence-backed manual Opportunity Radar is live at `https://jarvis.sageapps.in`. All Step 5 sub-steps (5.1–5.6) are deployed and accepted.

#### Deployment record

| Item | Detail |
|---|---|
| Deployed commit | `ef7eaa6` — `chore: add SQLite online backup utility` |
| Deployed from | `57017ea` → `ef7eaa6` (fast-forward, 23 files, 12 226 insertions) |
| `npm ci` | Clean — `better-sqlite3` loaded via prebuilt `linux-x64.node` |
| Production build | `npm run build -- --webpack` — clean, all routes compiled |
| Migration | `drizzle-kit migrate` run explicitly as `jarvis` user against `/home/jarvis/data/jarvis.db` — `[✓] migrations applied successfully!` — not triggered from application startup |
| DB path | `/home/jarvis/data/jarvis.db` — outside git working tree, survives deploys |
| DB ownership | `jarvis:users`, mode `640` |
| `/home/jarvis/data/` | `jarvis:users`, mode `750` — created during deploy |
| `/home/jarvis/backups/` | `jarvis:users`, mode `750` — created during deploy |

#### Backup record

| Item | Detail |
|---|---|
| Pre-restart backup | `jarvis_20260823_063610UTC.db`, 64.0 KB, `PRAGMA integrity_check` → `ok` |
| Backup mechanism | `better-sqlite3` async `.backup()` API — WAL-safe online hot backup, never a file copy |
| Daily cron | `30 2 * * *` (02:30 UTC daily, ~08:00 IST) under `jarvis` user |
| Cron node path | `/home/jarvis/.nvm/versions/node/v24.19.0/bin/node` (absolute) |
| Cron log | `/home/jarvis/logs/db-backup.log` |
| First scheduled run | **Not yet verified** — confirm after first 02:30 UTC run: `tail /home/jarvis/logs/db-backup.log` |
| Retention/deletion | Not configured — no automatic deletion yet |

#### HTTP verification

| Check | Result |
|---|---|
| `http://127.0.0.1:3000/login` | 200 |
| `http://127.0.0.1:3000/` (protected) | 307 → `/login` |
| `http://127.0.0.1:3000/opportunities` (protected) | 307 → `/login` |
| `https://jarvis.sageapps.in/login` | 200 |

#### Manual production acceptance

Passed by Santosh on 2026-08-23:
- GitHub OAuth login and session
- Opportunity create, edit, delete
- Evidence URLs: add, edit, remove
- Research notes: add, edit, remove
- Lifecycle transitions across all states (new → investigating → validate-now → validating → build; watch; rejected; reinvestigate; reconsider)
- Validation checklist toggles and counters (optimistic update + persist)
- All data persists across page reloads and browser restarts

#### Other services

All five existing Supervisor services (`cleansage`, `finsage`, `mailsage-auth`, `mailsage-bot`, `taxsage`) were untouched throughout — original PIDs and uptimes unchanged.

---

#### Next product step

**AI-assisted evaluation rubric** — define the 10-dimension scoring rubric and its weighting before selecting or integrating any AI provider. No AI provider, SDK, or API key is committed yet. Dead-code cleanup (`opp-detail.tsx`, `lib/opportunity-data.ts`, `lib/agents/opportunity-radar.ts`) should be done as a separate commit before or alongside the rubric work.

---

### Step 5.6 — SQLite online backup utility (complete, committed ef7eaa6)

Build, TypeScript, lint (0 errors), `npm audit --omit=dev` (0 vulnerabilities), `git diff --check` all pass. Tested against a disposable local database; test files removed.

| File | Change |
|---|---|
| `scripts/db-backup.js` | New CJS Node.js script: loads `.env.local` if present; validates `JARVIS_DB_PATH` and `JARVIS_BACKUP_DIR`; builds UTC-timestamped filename (`jarvis_YYYYMMDD_HHmmssUTC.db`); calls `better-sqlite3` async `.backup()` API (WAL-safe, never a file copy); runs `PRAGMA integrity_check` on completed backup; closes all connections in `finally`; cleans up partial file on failure; exits non-zero on any error |
| `package.json` | Added `"db:backup": "node scripts/db-backup.js"` script |
| `.env.example` | Added `JARVIS_BACKUP_DIR` section with setup instructions |
| `docs/ARCHITECTURE.md` | Added "Backup Utility" section: how it works, production setup command, env var requirement, note on no automatic retention |

**Usage:**
```bash
npm run db:backup
# Backup:    jarvis_20260823_062108UTC.db
# Size:      8.0 KB
# Integrity: ok
```

**Failure modes tested:** missing `JARVIS_DB_PATH`, missing `JARVIS_BACKUP_DIR`, source file not found — all exit 1 with a clear message.

**Production setup (one-time, as root):**
```bash
mkdir -p /home/jarvis/backups && chown jarvis:users /home/jarvis/backups && chmod 750 /home/jarvis/backups
```
Then add `JARVIS_BACKUP_DIR=/home/jarvis/backups` to `.env.local` on the server.

No automatic retention/deletion added yet.

---

### Step 5.5 — Lifecycle transitions and validation checklist (complete, deployed ef7eaa6)

Build, TypeScript, lint (0 errors), `npm audit --omit=dev` (0 vulnerabilities), `git diff --check` all pass.

| File | Change |
|---|---|
| `lib/opportunity-lifecycle.ts` | New shared module (no `server-only`, importable from both server and client): `LIFECYCLE_STEPS`, `LIFECYCLE_ORDER`, `STATUS_CONFIG`, `TransitionConfig` interface, `TRANSITIONS` (single source of truth for all lifecycle moves with label/variant/requiresNote/requiresConfirm), `ALLOWED_TRANSITIONS` (derived from TRANSITIONS — never out of sync) |
| `lib/db/queries.ts` | Removed inline `ALLOWED_TRANSITIONS` definition; now imports and re-exports from `lib/opportunity-lifecycle.ts` |
| `components/opportunities/opp-detail.tsx` | Removed duplicate `STATUS_CONFIG`, `LIFECYCLE_STEPS`, `LIFECYCLE_ORDER`, `TRANSITIONS` definitions; now imports from shared module. `STATUS_CONFIG` is still re-exported for backward compatibility. |
| `components/opportunities/lifecycle-panel.tsx` | New client component (`key={opp.id}-${opp.status}` on parent, so it remounts on status change): lifecycle progress bar; transition buttons with variant styling; Watch/Reject note textarea (optional reason saved as status note); Build confirmation step; `useTransition` for pending state; checklist loaded via `getOpportunityAction` on mount when `status === "validating"`; optimistic checklist updates with revert on error; compact progress bar (X/6 done) |
| `components/opportunities/opportunities-client.tsx` | Updated `STATUS_CONFIG` import to `@/lib/opportunity-lifecycle`; added `LifecyclePanel` import; renders `<LifecyclePanel key={opp.id+status} opp={selectedOpp} />` at the top of the read view in the detail panel |

**User-visible behaviour:**
- Detail panel shows a 5-step lifecycle progress bar (Discovered → Investigating → Validate Now → Validating → Build); current step highlighted in emerald; completed steps filled
- Off-path statuses (Watch, Rejected, Archived) show a coloured status banner instead of the bar
- Transition buttons appear below the bar; only allowed transitions for the current status are shown
- Watch/Reject: clicking opens an optional textarea; reason is saved as a `status` note in the DB
- Build: clicking opens a confirmation step before committing
- All transitions persist immediately; `router.refresh()` updates the list pill counts and the detail panel status
- After transitioning to `validating`, the panel remounts and automatically shows the Validation Checklist
- Checklist: 3 boolean toggles (CheckCircle2 / Circle), 3 counters with −/+ buttons and n/max display
- Each checklist change persists immediately with optimistic update and revert-on-error
- Progress bar (X/6) above the checklist shows overall completion
- Create/edit/evidence/notes all unchanged

**Architecture note:**
- `TRANSITIONS` in `lib/opportunity-lifecycle.ts` is the single source of truth. `ALLOWED_TRANSITIONS` (used by the server's transaction validator) is derived from it — changing one automatically updates the other. No lifecycle rules are duplicated.
- `LifecyclePanel` uses `key={opp.id}-${opp.status}` (parent side) so React remounts it on every status change — gives a clean initial `checklistLoading` state without synchronous setState in the effect body.

### Step 5.4 — Evidence and research notes UI (complete, committed c2548ee)

Build, TypeScript, lint (0 errors), `npm audit --omit=dev` (0 vulnerabilities), `git diff --check` all pass.

| File | Change |
|---|---|
| `lib/db/queries.ts` | Added `updateEvidence(evidenceId, UpdateEvidenceInput)` and `updateNote(noteId, UpdateNoteInput)` query helpers; new `UpdateEvidenceInput` and `UpdateNoteInput` interface exports |
| `app/(private)/opportunities/actions.ts` | Added `updateEvidenceAction` and `updateNoteAction` server actions with `UpdateEvidenceSchema` / `UpdateNoteSchema` Zod validation; empty strings for optional text fields converted to `null` (clears field in DB) |
| `components/opportunities/opp-detail-panel.tsx` | Added inline edit UI for evidence (URL, title, platform, summary) and notes (body, type); pencil icon beside each delete icon; clicking edit closes any open add form and prefills the row's current values; save calls update action then reloads panel; cancel restores read view; shared `EvidenceForm` and `NoteForm` sub-components avoid duplication between add and edit paths; `useTransition` for save pending state |
| `components/opportunities/opportunities-client.tsx` | Added `OppDetailPanel` import; renders `<OppDetailPanel key={selectedOpp.id} …>` — key prop remounts on selection change |

**User-visible behaviour:**
- Evidence and Research Notes sections appear below the core opportunity fields
- **Add**: "Add" button opens inline form; URL required (HTTP/HTTPS validated); title, platform, summary optional
- **Edit**: pencil icon on each row opens prefilled inline form with primary border; Save/Cancel buttons; save persists immediately and survives reload
- **Remove**: trash icon with `window.confirm()` dialog; optimistic removal from local list + `router.refresh()`
- Evidence URLs render as safe external links (`target="_blank"` `rel="noopener noreferrer"`)
- Notes show research/status type badge and creation date; type can be changed on edit
- Switching opportunity remounts the panel — clean state, no stale data
- Loading spinner shown while fetching; per-field error messages on validation failure

**Design notes:**
- `OppDetailPanel` uses `key={opportunityId}` (parent side) so React remounts on selection change — avoids synchronous `setState` in `useEffect` body (lint rule `react-hooks/set-state-in-effect`)
- Only one evidence row and one note row can be in edit mode at a time; opening a second edit cancels the first
- `Add` button hidden while any row in that section is in edit mode (prevents conflicting form state)

### Step 5.3 — Core UI connected to database (complete, deployed ef7eaa6)

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

**Step 6.0 — Documentation + dead-code cleanup** (in progress — rubric doc committed, dead-code removal pending).

See `docs/OPPORTUNITY_EVALUATION_RUBRIC.md` for the full approved rubric design.
See `docs/ARCHITECTURE.md` (Step 6 section) for the implementation architecture.

#### Step 6.0 dead-code removal (next commit)

These files are confirmed unreferenced in the live path and must be deleted:

| File | Reason |
|---|---|
| `components/opportunities/opp-detail.tsx` | Targets old `OpportunityRecord` type; not rendered anywhere in the live path. `STATUS_CONFIG` + `TRANSITIONS` now live in `lib/opportunity-lifecycle.ts`. |
| `lib/opportunity-data.ts` | 7 hard-coded demo records, unreferenced. |
| `lib/agents/opportunity-radar.ts` | Mock simulation, unreferenced. |

Also: remove or rewire the "Run Radar" button in `opportunities-client.tsx` (currently calls the dead mock agent).

#### Step 6 sequence (do not start until 6.0 is committed and deployed)

| Step | Scope | Status |
|---|---|---|
| **6.0** | Documentation + dead-code cleanup | In progress |
| **6.1** | Schema (2 new columns + migration), types, query helper, stub server action | Pending |
| **6.2** | Real AI evaluator (`lib/ai/rubric.ts`, `lib/ai/evaluate-opportunity.ts`, `@anthropic-ai/sdk`) | Pending |
| **6.3** | Scorecard UI (`scorecard-panel.tsx`, wire into `opportunities-client.tsx`) | Pending |

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

## Operational Prerequisites (completed 2026-08-23)

Both directories created, owned, and permissioned during the production launch deploy:

```
/home/jarvis/data/    — jarvis:users, mode 750 — contains jarvis.db (mode 640)
/home/jarvis/backups/ — jarvis:users, mode 750 — daily backup files land here
```

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
