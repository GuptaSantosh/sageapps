@AGENTS.md

# Jarvis — Claude Code Project Context

## Purpose and Scope

Santosh's private AI command center. Single authorized user only (GitHub numeric ID `8694772`). Not a public or multi-user product. Hosted on DigitalOcean at `jarvis.sageapps.in`.

## Read This First

Before writing any code, read `docs/CURRENT_STATE.md`. It records what is done, what is demo-only, and the exact next action. Do not rediscover the repository from scratch — read only the sections and files relevant to the current task.

Update `docs/CURRENT_STATE.md` after every completed implementation or deployment milestone.

## Working Method

One small task at a time. Inspect before changing. Make the minimum necessary change. Review before proceeding. Do not refactor, add features, or clean up surrounding code unless explicitly asked.

## Repository Boundaries

- `git main` is the source of truth. Every change is committed and pushed.
- This repository is at `Personal Dashboard/jarvis/` inside the `sageapps` monorepo. Never modify unrelated SageApps projects (finsage, mailsage, taxsage, cleansage).
- Never place secrets, tokens, or credentials in code, documentation, `.env.example`, GitHub issues, or chat output.

## Essential Commands

```bash
# Development
npm run dev                        # http://localhost:3000

# Production build (Turbopack OOM-kills on the DO droplet — always use webpack)
npm run build -- --webpack

# Type check (run after build to get fresh .next/types)
npx tsc --noEmit

# Lint
npm run lint

# Push to GitHub (use preconfigured Git authentication — never put a token in a command, URL, or shell history)
git push
```

## Production Deploy

```bash
# On MacBook: commit + push
# On server (via SSH as root):
cd /home/jarvis/sageapps && git pull
npm ci                              # required if package.json changed or native modules added
npm run build -- --webpack
supervisorctl restart jarvis
```

Server: `134.209.144.250` · user `jarvis` · supervisor service `jarvis` · app at `/home/jarvis/sageapps/Personal Dashboard/jarvis/`

## Authentication Pattern

All protected server-side mutations (route handlers, server actions) must authenticate first:

```ts
import { requireAuth } from "@/lib/auth-server";

export async function myServerAction() {
  "use server";
  const session = await requireAuth(); // redirects to /login if not authed
  // session.user.githubId is the authorized GitHub numeric ID
}
```

Never rely on `proxy.ts` alone. Authorization is enforced at three independent layers: `proxy.ts`, `app/(private)/layout.tsx`, and `requireAuth()` in handlers/actions.

## Architecture Reference

See `docs/ARCHITECTURE.md` for verified current file layout, data flow, lifecycle map, and deployment constraints.
