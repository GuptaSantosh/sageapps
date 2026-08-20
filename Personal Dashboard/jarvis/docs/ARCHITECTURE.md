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

## Proposed Future Architecture (CANDIDATE — not approved)

**Step 5: SQLite persistence for Opportunity Radar.**

Candidate stack: `better-sqlite3` + `drizzle-orm` + Next.js Server Actions. Data file at `/home/jarvis/data/jarvis.db` (outside git repo). Page refactored from `"use client"` with `useState` to Server Component fetching from DB, passing to a Client Component shell.

**This is a candidate only.** Prerequisites unverified — see `docs/CURRENT_STATE.md` for unresolved questions before approving.
