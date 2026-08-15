# Data Room

Requirements: docs/task.md. Architecture decisions + rationale: docs/architecture.md.
Rules below take precedence.

## Stack (see docs/architecture.md for rationale)

- Domain: bonadev.xyz. Frontend: Vite SPA (not Next/TanStack Start), Vercel,
  `data.bonadev.xyz`. Backend: NestJS on Railway, `api.data.bonadev.xyz` —
  frontend calls it directly, no proxy.
- DB + file storage: Supabase (Postgres + Storage).
- Auth: Better Auth (not Passport), Google OAuth2 + email/password, httpOnly
  cross-subdomain cookie session (`.data.bonadev.xyz`, same-site not cross-site)
  — no JWT in localStorage/client state.
- Package manager: pnpm.
- Frontend data: TanStack Query (server state) + TanStack Table (headless,
  drives both list and grid view of files/folders).
- Monorepo: pnpm workspaces, no Turborepo/Nx. `apps/web`, `apps/api`,
  `packages/shared` (shared TS types/DTOs/zod schemas — validate once, use on
  both sides).
- CD via native Vercel/Railway git integration (no GH Actions deploy step).
  CI (typecheck/lint/tests) is a required GitHub Actions check on PRs into
  `main`, even solo.
- File storage: private Supabase bucket, object key = `fileId` (not
  name/path), client uploads directly to Storage via backend-issued signed
  URLs (backend checks Postgres `Share` rows first), backend uses
  service_role key, no Supabase Storage RLS policies.

## Priorities

UX and edge cases > visual polish > code quality. Ship working slices end-to-end.
Don't build features not in docs/task.md, even if they seem obviously useful.

## Docs

architecture.md is the single source of truth for architecture rationale.
CLAUDE.md's Stack list and README.md's Design decisions section only summarize
it with a link back — don't restate rationale there. When an architectural
decision changes, update architecture.md first, then check whether the Stack
list (here) or README summary needs a one-line edit to match.

## Conventions

- Commits: feat|fix|refactor|chore|docs(scope): imperative
- Scopes: api, web, infra, auth, nodes, uploads, sharing
- Branches: type/short-description
- Issues: one per slice of docs/roadmap.md, titled `Slice N: short description`
  (`Slice 1: Auth`). Body sections, in this order:
  - `## Slice` — one or two sentences: what works end-to-end once it's done.
  - `## Scope` — `In:` what the slice covers; `Out:` what it deliberately leaves.
  - `## PRs` — links to the slice's PRs, appended as they merge.
  - `## Acceptance` — checklist, including error/edge-case states; ticked off
    as the slice lands.
  - `## Notes` — decisions worth recording, deferred work.
- PRs: title in commit format. Body sections, in this order:
  - `## What` — one or two sentences: what now works or changed.
  - `## Why` — only when the decision isn't obvious: why this way, not another.
  - `## How to test` — manual steps, or "covered by tests".
  - `## Notes` — what was deliberately left out, what's deferred.
