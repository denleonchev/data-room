# Architecture

Status: work in progress. This document captures decisions made so far, in the order
we made them. API design and the file upload flow are not decided yet and will be
added as separate sections later.

## Diagram

```mermaid
flowchart TB
    subgraph Client["Browser"]
        SPA["React SPA<br/>data.bonadev.xyz"]
    end

    subgraph VercelBox["Vercel"]
        Web["apps/web<br/>static build"]
    end

    subgraph RailwayBox["Railway"]
        API["apps/api<br/>NestJS · api.data.bonadev.xyz"]
    end

    subgraph SupabaseBox["Supabase"]
        Storage[("Storage<br/>private bucket")]
        PG[("Postgres")]
    end

    Google["Google OAuth"]

    SPA -- "loads app" --> Web
    SPA -- "HTTPS + cookie<br/>.data.bonadev.xyz" --> API
    SPA -- "PUT/GET via<br/>signed URL" --> Storage
    API -- "Prisma" --> PG
    API -- "service_role key,<br/>issues signed URLs" --> Storage
    API -- "OAuth2" --> Google
```

File bytes never pass through `apps/api` — the browser talks to Storage directly
for both upload and download, using signed URLs the backend issues after checking
Postgres. Everything else (folders, sharing, metadata) goes through the API.

## Hosting

| Component           | Where                           | Why                                                                            |
| ------------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| Frontend            | Vercel, `data.bonadev.xyz`      | Recommended by the task; standard fit for a React/Next app                     |
| Backend (NestJS)    | Railway, `api.data.bonadev.xyz` | Simple Node deploy from git, generous free tier                                |
| Database (Postgres) | Supabase                        | Managed, no separate provisioning needed                                       |
| File storage        | Supabase Storage                | S3-compatible, lives next to the DB, avoids standing up a separate AWS account |

Decided against Supabase Auth even though Supabase is already in the stack: the task
explicitly names NestJS + Postgres + Prisma as the expected stack, and rolling our own
auth is part of what's being evaluated. Offloading it to Supabase Auth would remove a
piece of the demonstrated backend work.

## Frontend framework: Vite SPA

Considered and rejected:

- **Next.js** — not the stack the task names (task says "we use React /
  TypeScript / Tailwind / Shadcn", not Next). Rejecting it isn't about Next's
  quality, just stack conformance: no reason to bring in extra framework surface
  the task doesn't ask for.
- **TanStack Start** — went through two rounds:
  1. Rejected first: v0, its Nitro plugin is marked actively-in-development, and
     running two runtimes (edge + Node backend) is an extra moving part for no
     clear gain.
  2. Reconsidered once it became clear that, without a BFF, auth is the murkiest
     part of the system — Start keeps the session first-party on a single origin,
     no custom domain wiring needed, API never exposed publicly. At that point
     Start looked worth the Nitro setup cost, more so than a plain Vite SPA.
  3. That reason then disappeared: `data.bonadev.xyz` and `api.data.bonadev.xyz`
     share a parent domain, so cookies scoped to `.data.bonadev.xyz` (see Auth
     below) are same-site, not cross-site, in the browser's eyes — no
     third-party-cookie blocking, no same-origin trick needed. Direct
     cross-subdomain requests already solve the auth problem Start was brought
     in for.
  - What Start still offered: SSR on the public `/s/:token` share route would
    produce an OG preview when a shared link is pasted into Slack/etc. Nice, but
    not worth adopting a whole framework (plus its immaturity) for.

Conclusion: nothing in this app needs SSR — everything meaningful sits behind
auth, and the one public route's OG-preview nicety isn't worth the cost. The
cross-subdomain cookie already handles auth without a same-origin trick, so a
frontend framework with a server isn't needed at all. **Vite SPA** gets the same
result with fewer moving parts, talking directly to `api.data.bonadev.xyz`.

## Frontend libraries: TanStack Query + TanStack Table

- **TanStack Query** for server state: caches folder/file listings, invalidates on
  mutations (move/rename/delete/upload), background refetch. Not tied to TanStack
  Start — works standalone in any React app.
- **TanStack Table** for the file/folder list: headless, so it only owns state
  (sorting, filtering, pagination, row model) and leaves rendering to us — the same
  row model can be mapped to `<table>` rows for list view or to cards for grid
  view (Drive supports both), sharing one sort/filter/pagination state across both.
  Also the natural place to hang virtualization for the 100k-files scale case (see
  Open questions).

## Auth

- Library: **Better Auth**, not Passport.
  - Passport is the idiomatic NestJS choice but requires a Strategy + Guard class per
    provider (Google, local, JWT) — roughly 150-250 lines across 6-8 files for minimal
    coverage.
  - Better Auth needs one config object (Prisma adapter, `emailAndPassword`,
    `socialProviders.google`) mounted via `app.use()` in `main.ts`, plus one guard that
    calls `auth.api.getSession()`. Less idiomatic-Nest boilerplate, but the task is
    evaluated on data model/sharing/UX, not on auth scaffolding, so the trade-off favors
    less code.
- Methods: Google OAuth2 + email/password, per task requirements.
- Session transport: **httpOnly cookie**, not a JWT kept in localStorage/state —
  avoids token theft via XSS entirely (no JS-readable token to steal).

## Cross-subdomain cookie setup

Domain: **bonadev.xyz** (personal domain, hosts other projects too). Frontend calls
`api.data.bonadev.xyz` directly — no rewrite proxy. (A Vercel rewrite proxy was
considered, to make the browser see a single origin, but rejected: this app is
upload-heavy, and proxying file bodies through Vercel's edge adds a hop and its own
size/streaming limits for no real benefit once cross-subdomain cookies already work.)

- Frontend: `data.bonadev.xyz`
- Backend: `api.data.bonadev.xyz` (nested under `data.bonadev.xyz`, not a sibling
  of it — keeps this app's subdomains grouped and out of the way of other projects
  on `bonadev.xyz`)

Frontend and backend are on different subdomains, so the session cookie needs to be
readable across both:

- Cookie domain: `.data.bonadev.xyz` (leading dot, scoped to this app's subdomain
  tree, **not** the bare `.bonadev.xyz` root) — narrower scope means the cookie
  never gets sent to unrelated projects on the same root domain. `data.bonadev.xyz`
  and `api.data.bonadev.xyz` share this parent, so it's still a same-site request
  from the browser's perspective, not cross-site.
- Better Auth config: `crossSubDomainCookies: { enabled: true, domain: ".data.bonadev.xyz" }`.
- Backend CORS: `credentials: true`, origin allow-list = `https://data.bonadev.xyz`.
- Frontend: all API calls use `credentials: 'include'`; no manual token storage/attachment.

## Tooling

- Package manager: **pnpm**. Content-addressable store avoids duplicating packages on
  disk, hard-links make installs faster than npm/yarn, and it blocks phantom
  dependencies (importing a package that's only a transitive dep, not a direct one).

## Monorepo layout

Single repo, pnpm workspaces — no Turborepo/Nx, plain workspaces are enough at this
size and skip extra build-orchestration config for a time-boxed project.

- `apps/web` — frontend (Vite SPA)
- `apps/api` — backend (NestJS)
- `packages/shared` — TS types/interfaces shared between both (DTOs, enums like
  `ShareMode`/role), and zod schemas used for validation on both sides: NestJS DTOs
  validate with the same schema the frontend uses for form validation, so the
  contract can't drift between client and server.

## CI/CD

```mermaid
flowchart LR
    PR["push to PR branch"] --> CI["GitHub Actions<br/>typecheck · lint · test"]
    CI -- "required check passes" --> Merge["merge to main"]
    Merge -- "apps/web or<br/>packages/shared changed" --> Vercel["Vercel<br/>auto-deploy"]
    Merge -- "apps/api or<br/>packages/shared changed" --> Railway["Railway<br/>auto-deploy + migrate"]
```

Deployment and CI are kept separate — deployment doesn't run through GitHub
Actions at all:

- **CD**: native git integrations, no custom deploy scripts. Both sides must
  rebuild when `packages/shared` changes, not just when their own app dir
  changes:
  - Vercel: root directory `apps/web`, auto-deploys on push to `main`, preview
    deployment per PR. Ignored Build Step set to
    `git diff --quiet HEAD^ HEAD -- . ../../packages/shared` — runs with cwd =
    Root Directory (`apps/web`), so paths are relative to that, not the repo
    root (a repo-root-relative version of this command shipped first and
    silently skipped every build, since `apps/web/apps/web` and
    `apps/web/packages/shared` never exist). Exits 0 (skip build) when a push
    only touches `apps/api`, exits non-zero (build) when `apps/web` or
    `packages/shared` changed — both paths are in the command, so a
    shared-only change still triggers a web rebuild.
  - Railway: **no Root Directory override** — service Source stays at the repo
    root, config lives in `railway.json` at the repo root (not inside
    `apps/api`), and `buildCommand`/`startCommand` use `pnpm --filter <pkg>`
    from the repo root rather than a Root-Directory-scoped `cd`/`-C`. Watch
    paths explicitly include `packages/shared` (unlike Vercel, Railway needs this
    listed or a shared-only change won't trigger an API redeploy). Builds via
    Railway's Nixpacks (auto-detects Node/pnpm, no Dockerfile to write/
    maintain) — install phase stays on Nixpacks' default, `buildCommand`
    explicitly builds `packages/shared` then `apps/api`. Falls back to a
    hand-written Dockerfile only if Nixpacks can't handle that.
  - Migrations: `prisma migrate deploy` runs as part of Railway's start command,
    before the server boots — not a separate CI step.
- **CI**: a GitHub Actions workflow (`pnpm install` → typecheck → lint → tests)
  runs on every PR. Even solo, work happens through PRs into `main` with branch
  protection requiring this check to pass — catches breakage before it reaches
  `main`, where Vercel/Railway would otherwise deploy it immediately.

## File storage (Supabase Storage)

- **Bucket is private**, never public. Even the "public link" share mode doesn't
  rely on a public bucket policy — the backend checks the `Share` row in Postgres
  and issues a short-TTL signed URL itself. Keeping authorization solely in
  Postgres/Nest avoids running two permission systems (app logic + Supabase
  Storage/RLS policies) that could drift apart.
- **Object key = `fileId` (UUID)**, not the file's display name/path. Renaming or
  moving a file in the folder tree only changes rows in Postgres; the stored
  object never needs to move.
- **Upload goes client → Storage directly**, not through the backend: client
  requests a signed upload URL for a given `fileId`, PUTs the file straight to
  Supabase Storage, then confirms completion to the backend. Keeps file bytes off
  the Railway process (memory/bandwidth) and gives real per-file progress via the
  upload request itself.
- **One bucket for the whole app**, not one per Data Room — granularity of access
  lives in Postgres rows, not in bucket structure.
- Backend talks to Storage with the **service_role key** (server-side only, never
  shipped to the client); no Supabase Storage RLS policies are used.

## Data model

```mermaid
erDiagram
    user ||--o{ node : owns
    node ||--o{ node : contains
    node ||--o{ share : "is shared by"

    user {
        text id PK
        text email UK
        text name
    }
    node {
        uuid id PK
        NodeType type "FOLDER | FILE"
        text name
        text ownerId FK
        uuid parentId FK "null on a Data Room"
        timestamp createdAt
        timestamp updatedAt
    }
    share {
        uuid id PK
        uuid nodeId FK
        ShareMode mode "PUBLIC_LINK"
        ShareRole role "VIEWER"
        text token UK "public links only"
        timestamp createdAt
        timestamp updatedAt
    }
```

**A Data Room is a folder without a parent.** There is no separate `DataRoom`
entity: it would hold nothing but its owner, and the owner sits on `node.ownerId`
directly, where every access check reads it without a join. The task itself
describes a Data Room as "the top-level folder or drive", and the model says the
same thing. One room per user, created on first sign-in and never created or
deleted by hand; a partial unique index (`ownerId` where `parentId IS NULL`)
enforces that in the database, which also settles the race when a user signs in
from two tabs at once. The room is renamable, and it can be shared — sharing a
Data Room, a folder or a single file is one requirement, not three.

**Folders and files share one table**, discriminated by `type`. The subtree walk
behind counts, sizes, deletion and access checks is then written once and already
counts files correctly before the first file exists. The price is columns that only
files use (`size`, `mimeType`, `storageKey` arrive in slice 3) sitting empty on
folder rows.

**`type` has no `ROOM` value**, even though a room is a distinct thing in the UI.
A room behaves like a folder in every operation — it holds children, it is a move
target, it can be renamed, shared and measured — and differs only in two
prohibitions: it can't be deleted and can't be moved, both checked as "the node has
no parent". A third type would invite `type = FOLDER` checks that silently exclude
the room, and the folder picker in the move dialog is exactly where that bug would
land.

**Deletion is permanent**, with the subtree following through a self-referencing
`ON DELETE CASCADE`. Soft deletion would buy a trash bin the task doesn't ask for,
and charge for it with a "hide deleted rows" filter in every query — including the
share access path, where forgetting it leaks a deleted file to a link recipient.
"Someone deleted the folder you're viewing" is handled where it belongs: a 404, a
toast, and a move to the parent.

**Names are unique per folder and case-sensitive** — `Report.pdf` and `report.pdf`
coexist, as they do in Google Drive and on Linux. Normalization is a trim, nothing
more. A case-insensitive rule would need an index over `lower(name)`, which Prisma
cannot express in the schema and would report as drift on every later migration.

**`Share` ships with the tree**, in slice 2's migration, though nothing reads it
before slice 6 — so the model is decided once instead of being remodelled halfway.
A share always points at a node, which is what keeps "share the whole Data Room"
from becoming a second branch in the access rules. `mode` and `role` start with one
value each: `RESTRICTED` and the grantee columns arrive in slice 7, `EDITOR` is the
extension point for per-user roles. Adding a value to an enum is not a remodelling.
Revoking a share deletes its row.

## Open questions / not yet decided

- Folder tree strategy for subtree size/count aggregation at scale
- Exact upload-confirm / download-URL API endpoints (shape decided above, routes not yet)
- API surface
