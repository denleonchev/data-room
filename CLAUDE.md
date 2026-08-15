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
