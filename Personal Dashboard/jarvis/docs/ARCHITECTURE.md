# Jarvis — Architecture Reference

> This document describes **verified, currently implemented** architecture only.
> Proposed future changes are clearly labelled.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.3.1 (App Router) |
| Runtime | Node.js (not Edge — full Node API available everywhere) |
| Auth | Auth.js v5 (`next-auth@5.0.0-beta.32`), GitHub OAuth, JWT sessions |
| Styling | Tailwind v4 + shadcn/ui (`components/ui/`) |
| Build | Webpack (`npm run build -- --webpack`). Turbopack OOM-kills on the droplet. |
| Deployment | DigitalOcean droplet `134.209.144.250`, Supervisor, nginx reverse proxy, Let's Encrypt TLS |

## Route Structure

```
app/
  layout.tsx                  # Root layout — html/body/fonts only, no auth
  (public)/
    login/page.tsx            # Public login page. Sanitizes callbackUrl.
  (private)/
    layout.tsx                # Auth gate (calls auth(), redirects if no session)
    page.tsx                  # Overview /
    agents/page.tsx           # Agents
    opportunities/page.tsx    # Opportunity Radar workspace
    projects/page.tsx         # Projects
    insights/page.tsx         # Insights
    settings/page.tsx         # Settings
  api/
    auth/[...nextauth]/route.ts  # Auth.js OAuth handlers (GET + POST)
```

## Authentication Layers (defence-in-depth)

Three independent layers — removing any one does not remove protection:

1. **`proxy.ts`** — Named export `proxy` (Next.js 16 convention). Redirects unauthenticated requests to `/login?callbackUrl=<path>`. Matcher excludes `/login`, `/api/auth/**`, static assets.
2. **`app/(private)/layout.tsx`** — Server Component. Calls `auth()`, redirects if no session. Every private page inherits this.
3. **`lib/auth-server.ts`** — `requireAuth()` helper. Must be called in every route handler and server action that reads or mutates private data.

**Authorization**: single GitHub numeric ID (`AUTHORIZED_GITHUB_ID` env var). Enforced in `auth.ts` `signIn` callback. JWT stores only `githubId`. Never use username/email/display name for auth.

## Key Files

| File | Purpose |
|---|---|
| `auth.ts` | Auth.js config — signIn/jwt/session callbacks |
| `proxy.ts` | First-line redirect gate |
| `lib/auth-server.ts` | `requireAuth()` — server-only, import "server-only" |
| `lib/types.ts` | All TypeScript types. Opportunity types at lines 94–243. |
| `lib/opportunity-data.ts` | 7 hard-coded demo `OpportunityRecord` objects + `RADAR_STATS` |
| `lib/agents/opportunity-radar.ts` | Mock agent run — simulated delay, returns demo text |
| `components/opportunities/opp-detail.tsx` | Detail panel. Exports `STATUS_CONFIG`. |
| `next.config.ts` | Security headers (CSP, X-Frame-Options, etc.) |

## Opportunity Radar — Current Data Flow

```
lib/opportunity-data.ts          (build-time TypeScript constant)
  OPPORTUNITIES: OpportunityRecord[]
        |
        v
app/(private)/opportunities/page.tsx   ("use client")
  useState(() => [...OPPORTUNITIES])   <-- initialized once at mount; lost on reload
  useState<Record<string, Notes>>({})  <-- oppNotes; also session-only
        |
  handleStatusChange() --> setOpps()   (pure React state mutation)
  handleChecklistChange() --> setOpps()
        |
        v
  <OppDetail opp={selectedOpp}
    onStatusChange={...}
    onChecklistChange={...}
  />
```

**All state is client-side React.** There are no API routes, server actions, or database calls for opportunities. Every mutation is lost on page reload. This is the gap Step 5 addresses.

## Opportunity Lifecycle

8 statuses (`lib/types.ts:130–138`):

```
new --> investigating --> validate-now --> validating --> build   (terminal)
              |                |               |
              +---> watch <----+---------------+   (reversible via Reinvestigate)
              +---> rejected <-+---------------+   (reversible via Reconsider)
              archived                             (terminal, currently unused)
```

Transitions defined in `opp-detail.tsx:406–433` (`TRANSITIONS` map). "Move to Build" requires confirmation. "Watch" and "Reject" accept an optional free-text note (stored in `oppNotes` state, not on `OpportunityRecord`).

Auto-provision: entering `validating` for the first time auto-creates a blank `ValidationChecklist` (`page.tsx:193–202`).

## Opportunity Types Summary

Full definitions in `lib/types.ts:94–243`. Key nested objects:
- `OpportunityThesis` — 5 string fields (problem, who, why hurts, why pay, why now)
- `DetailedScorecard` — 10 dimensions × `{score: number, justification: string}` + `overall` + `weightedNote`
- `EvidenceSignal[]` — platform, title, author, date, url?, summary, signalType (6 enum values)
- `CompetitiveAlternative[]` — name, type (4 enum values), gap
- `ValidationPlan?` — 7 fields including 5-person list + 3 interview questions
- `ValidationChecklist?` — 2 bool + 4 counter fields

## Deployment Architecture

```
Internet
  --> nginx (port 80 → 301 HTTPS; port 443 TLS termination)
      --> http://127.0.0.1:3000  (Next.js, bound to loopback only)
            Supervisor service: jarvis
            User: jarvis
            Start: /home/jarvis/start.sh
            Logs: /home/jarvis/logs/
            App:  /home/jarvis/sageapps/Personal Dashboard/jarvis/
            Node: /home/jarvis/.nvm/versions/node/v24.19.0/bin/node
            nvm:  v0.40.5
```

nginx forwards: `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Host`, `X-Forwarded-Proto`, `X-Forwarded-Port`.

`AUTH_TRUST_HOST=true` is required in `.env.local` — without it, Auth.js rejects every production request as `UntrustedHost`.

TLS cert: Let's Encrypt, expires 2026-11-18, auto-renewal registered.

Existing Supervisor services (must never be disturbed): `cleansage`, `finsage`, `mailsage-auth`, `mailsage-bot`, `taxsage`.

## Approved Step 5 Persistence Architecture

**SQLite + `better-sqlite3` + Drizzle ORM — approved 2026-08-20.**

All prerequisites verified on the droplet (see `docs/CURRENT_STATE.md`).

### Persistence Stack

| Layer | Decision |
|---|---|
| Database | SQLite, WAL mode |
| Driver | `better-sqlite3` (native module — compiles on server; toolchain confirmed) |
| ORM / migrations | Drizzle ORM + Drizzle Kit; SQL migrations committed to git |
| DB file | `/home/jarvis/data/jarvis.db` — outside git working tree, survives deploys |
| Access | Server-side only (Server Actions + route handlers). Never read from a Client Component. |
| Auth guard | Every mutation must call `requireAuth()` before touching the DB |
| Migration strategy | Explicit controlled deploy step — never automatic on application startup |

### Approved Data Flow (Step 5 target)

```
Browser (Client Component — filter/select/display only)
  |  server action call + router.refresh()
  v
app/(private)/opportunities/actions.ts   (Server Actions)
  requireAuth()  →  zod validation  →  DB query
  v
lib/db.ts   (singleton better-sqlite3 connection, WAL mode, runs pending migrations on deploy)
  v
/home/jarvis/data/jarvis.db   (outside git repo, survives restarts and deploys)
```

### Approved Schema (four tables)

**`opportunities`** — core fields, status, timestamps. AI-era fields (`scorecard`, `recommendation`, detailed `thesis`) are nullable — a new genuine opportunity does not require AI evaluation data.

**`opportunity_evidence`** — multiple records per opportunity. Fields: source URL (required), title, platform/type, author, date, summary, signal classification (all optional). Replaces the current `EvidenceSignal[]` array embedded in the record.

**`opportunity_notes`** — multiple notes per opportunity. Supports ongoing research notes and status-related reasons. Not restricted to one rejection-reason or watch-note as in the current `oppNotes` React state.

**`validation_checklist`** — one row per opportunity, auto-provisioned when status enters `validating`. Preserves current behaviour from `page.tsx:193–202`.

No lifecycle-event/audit-history table in V1.

### Operational Prerequisites (must be done before first DB-backed startup)

```bash
# Create data directory — SSH as root, one-time before first deploy with DB
mkdir -p /home/jarvis/data && chown jarvis:users /home/jarvis/data && chmod 750 /home/jarvis/data

# Create backups directory — must exist before real data is entrusted to the system
mkdir -p /home/jarvis/backups && chown jarvis:users /home/jarvis/backups && chmod 750 /home/jarvis/backups
```

**Backup strategy:** use the `better-sqlite3` `.backup()` API or SQLite `.backup` command for online hot backups. Never use plain `cp` on a WAL-mode database — the WAL and SHM files must be included and consistent.

## Backup Utility

`scripts/db-backup.js` — CommonJS script, no build step required.

```bash
npm run db:backup
```

**How it works:**

1. Reads `JARVIS_DB_PATH` (source) and `JARVIS_BACKUP_DIR` (destination directory) from env; loads `.env.local` if present.
2. Fails clearly if either variable is unset, the source file does not exist, or the destination directory does not exist.
3. Builds a UTC-timestamped filename (`jarvis_YYYYMMDD_HHmmssUTC.db`) and fails if a file with that name already exists.
4. Calls `better-sqlite3`'s async `.backup(destPath)` API — WAL-safe online hot backup; never a raw file copy.
5. Opens the completed backup as read-only and runs `PRAGMA integrity_check`.
6. Closes both connections in a `finally` block; cleans up the partial file on any failure.
7. Exits non-zero on any failure; on success prints only: filename, size, integrity result.

**Production setup (one-time, as root):**
```bash
mkdir -p /home/jarvis/backups && chown jarvis:users /home/jarvis/backups && chmod 750 /home/jarvis/backups
```

**`.env.local` on server must include:**
```
JARVIS_BACKUP_DIR=/home/jarvis/backups
```

No automatic retention/deletion — run manually or via a cron job.

### Approved Deploy Sequence (with DB)

```bash
# Server — after git pull and build:
npx drizzle-kit migrate          # explicit migration step; run once per deploy, not on startup
supervisorctl restart jarvis
```

### Files to be Created (implementation, not yet done)

| File | Purpose |
|---|---|
| `lib/db/schema.ts` | Drizzle table definitions |
| `lib/db/index.ts` | Singleton `better-sqlite3` connection, WAL mode |
| `lib/db/queries.ts` | Typed query helpers |
| `drizzle.config.ts` | Drizzle Kit config (`JARVIS_DB_PATH` env var) |
| `migrations/` | Generated SQL migration files (committed to git) |
| `app/(private)/opportunities/actions.ts` | Server Actions: create, updateStatus, updateChecklist, updateNotes |

### Seed Behaviour

Production starts **empty**. The seven fictional opportunities in `lib/opportunity-data.ts` must not be seeded into the production database. That file may remain as a non-production fixture/reference until safely removed.

## Step 6: AI-Assisted Opportunity Evaluation

> **Canonical reference:** `docs/OPPORTUNITY_EVALUATION_RUBRIC.md`
> All dimension definitions, weights, scoring mechanics, output schema, decision
> thresholds, and V0.1 design decisions are recorded there. Do not duplicate or
> re-derive them here.

### Summary

A manual "Evaluate with AI" button in the opportunity detail view sends the
opportunity's problem statement, evidence, and notes to Claude. Claude scores nine
weighted dimensions (total 100 points) and returns a structured JSON evaluation.
The result is persisted to the `opportunities` table and displayed in a new
`ScorecardPanel` component.

AI evaluation is **advisory only**. It never automatically changes lifecycle status.
"Build" is never AI-awarded.

### Schema Additions (Step 6.1)

Two nullable columns added to `opportunities` via a new migration:

| Column | Type | Purpose |
|---|---|---|
| `eval_score` | INTEGER nullable | Weighted total (0–100) — queryable for sort/filter |
| `evaluated_at` | TEXT nullable | ISO 8601 UTC timestamp of last evaluation |

All other evaluation data lives in the existing nullable `scorecard` (JSON),
`recommendation`, and `recommendation_reason` columns.

### New Files (Step 6)

| File | Purpose |
|---|---|
| `lib/ai/rubric.ts` | Nine dimension definitions + weights — single source of truth |
| `lib/ai/evaluate-opportunity.ts` | Prompt builder → Claude API call → Zod parse → `OpportunityEvaluation` |
| `components/opportunities/scorecard-panel.tsx` | Client component: "Evaluate" button, spinner, full scorecard display |

### Data Flow

```
Browser: "Evaluate with AI" button
  |
  v
evaluateOpportunityAction(id)   [Server Action]
  requireAuth()
  load opportunity + evidence + notes
  |
  v
lib/ai/evaluate-opportunity.ts
  build prompt (uses lib/ai/rubric.ts for dimension definitions)
  call claude-sonnet-4-6 (JSON output, no streaming)
  validate response with Zod
  |
  v
updateEvaluation(id, result)    [queries.ts]
  writes eval_score, evaluated_at, recommendation, recommendation_reason, scorecard
  revalidatePath("/opportunities")
```

### Implementation Sequence

| Step | Scope |
|---|---|
| 6.0 | Documentation + dead-code cleanup |
| 6.1 | Schema migration, types, query helper, stub action |
| 6.2 | Real AI evaluator + wired action |
| 6.3 | Scorecard UI component |
