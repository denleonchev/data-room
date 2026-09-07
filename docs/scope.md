# Scope

Built to a fixed take-home brief: a virtual data room where documents are
stored in a tree, kept private to their owner, and shared read-only with people
outside the account. Both halves deployed and publicly reachable.

This file says what was asked, what I added on top, and what I left out on
purpose. _Why_ each decision went the way it did lives in
[architecture.md](architecture.md); the order it was built in is in
[roadmap.md](roadmap.md).

## Required

**Tree**

- Create folders, nest folders inside folders
- Browse a folder's contents with breadcrumb navigation
- Rename a folder
- Delete a folder and everything under it, warning the user what goes with it

**Files**

- Upload PDFs: several at once, by drag-and-drop, with per-file progress
- View a file in the UI
- Rename a file, resolving name conflicts within a folder
- Move a file to another folder
- Delete a file

**Sharing**

- Share a data room, a folder or a single file; the recipient gets read-only
  access to it and everything nested under it
- Two modes: a public link, and a share restricted to named people
- The owner can revoke access

**Around it**

- Auth, with a data room private to its owner
- Files in blob storage
- A data model that survives growth, documented with an ERD and a "how it
  scales" section
- Both frontend and backend deployed

## Added

Not asked for. Each one is a place where doing the obvious thing would have
left a hole a real user falls into.

- **Restricted shares resolve by email at read time.** `granteeEmail` carries no
  foreign key to `User`, so an invite starts working the moment that address has
  a session — nothing to reconcile on sign-up, and inviting someone who hasn't
  registered yet is not a special case.
  (`apps/api/src/sharing/access.service.ts`)
- **A grantee's breadcrumb stops at the share root.** Sharing a folder five
  levels deep would otherwise leak the names of the four folders above it
  through the trail. Public links and restricted shares go through the same
  rule. (`AccessService.loadAccessible`, `NodeTreeService.ancestors`)
- **Uploads report real progress and can be cancelled.** The browser PUTs bytes
  straight to Storage over a signed URL the API issues, via `XMLHttpRequest`
  rather than the Storage SDK's helper — the helper wraps `fetch`, which has no
  upload-progress event, and the same `xhr` is what makes cancel possible.
  (`apps/web/src/features/uploads/use-upload-queue.ts`)
- **The recorded file size is Storage's, not the client's.** The browser's
  reported size is validated up front against the 50 MB cap, but `completeUpload`
  asks Storage what actually landed before marking the file `READY`, and the
  confirm is idempotent. (`apps/api/src/files/file.service.ts`)
- **Duplicate names inside one drop are caught before any bytes move.** Two
  copies of `Report.pdf` in the same selection fail on the second one client-side
  instead of spending an upload to earn a 409; collisions against what is already
  in the folder are still caught by the unique index server-side.
  (`packages/shared/src/file-upload.ts`)
- **Abandoned uploads clean themselves up.** A `PENDING` row from a closed tab
  is swept after 24 hours, lazily, in the one place that already decides what a
  folder contains — no cron, no scheduler dependency.
  (`NodeService.listChildrenOf`)
- **Folder counts come from an indexed prefix scan, not a recursive walk.** The
  materialized `path` column with a `text_pattern_ops` index answers "what is
  under here" in one `groupBy`: 304ms → 21ms at 100k nodes. It backs the delete
  warning, and total size is the same query with `_sum` added.
  (`NodeTreeService.subtreeStats`)
- **A move rewrites the whole subtree's ancestry in one transaction.** Moving a
  node changes the `path` of everything beneath it; the row and the subtree shift
  together or not at all, and moving a node into its own subtree is rejected
  before any write. (`NodeService.move`)
- **A node someone else owns answers 404, not 403.** Confirming that an id
  exists is already more than a stranger should learn.
- **A revoked or deleted share fails as a share, not as a blank screen.** The
  public view distinguishes "this link is no longer valid" from a 404 on the
  children query, so a file-rooted share doesn't render as a dead link.
  (`apps/web/src/routes/public-share-page.tsx`)

## Deliberately out of scope

Named because each was a decision, not an omission.

- **Full-text search inside documents.** The tree is indexed for prefix reads on
  `path`, not for content. Real search means extracting text on upload, a second
  index (Postgres FTS on a `tsvector` column, or an external one), and a rule for
  what a shared file's contents do in someone else's results. That is a slice of
  its own, not a filter on the list. Listed as extra credit in the brief.
- **File versioning on name conflicts.** `@@unique([parentId, name])` is what
  makes `(type, name)` a valid keyset cursor and what turns a conflict into a
  single 409. Versions replace it with a `(name, version)` pair and touch
  listing, move and share resolution at once — unlike `RESTRICTED`, which was
  additive to `PUBLIC_LINK`. Also extra credit.
- **Per-user editor rights.** `share.role` and the check point in `AccessService`
  exist; only `VIEWER` is ever written. Adding `EDITOR` is an enum value and a
  branch, not a migration — `RESTRICTED` already proved the row-per-grantee shape
  holds. Shipping it would have meant a second write-permission path through
  move, rename and delete, which the brief did not ask for. See
  [How it scales](../README.md#how-it-scales).
- **Trash and restore.** Deletion is permanent and cascades. A soft-delete flag
  would have to be honoured by every read path — listing, breadcrumbs, subtree
  counts, share resolution — and the brief asks for a warning before deleting,
  which is the other way to solve the same problem.
- **Pagination on a folder's children.** `listChildrenOf` returns them all,
  sorted folders-first then by name. At the sizes this MVP is exercised at, a
  page size buys nothing; the sort is already a valid cursor when it is needed.
  Reasoned through in [How it scales](../README.md#how-it-scales) rather than
  built.
