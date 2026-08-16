-- Materialized path: the ids of a node's ancestors, "/roomId/legalId/", "/" on a
-- Data Room. Subtree questions ("what is inside this folder") become a prefix
-- scan instead of a recursive walk down parentId — measured at 21ms vs 304ms
-- over 100k nodes, see docs/architecture.md.

-- AlterTable
ALTER TABLE "node" ADD COLUMN "path" TEXT;

-- Backfill. No endpoint creates nodes yet, so this is a no-op today; it is here
-- so the migration is correct on any database that does hold rows.
WITH RECURSIVE walk AS (
    SELECT "id", '/'::TEXT AS "path" FROM "node" WHERE "parentId" IS NULL
    UNION ALL
    SELECT n."id", w."path" || n."parentId" || '/'
    FROM "node" n JOIN walk w ON n."parentId" = w."id"
)
UPDATE "node" SET "path" = walk."path" FROM walk WHERE "node"."id" = walk."id";

ALTER TABLE "node" ALTER COLUMN "path" SET NOT NULL;

-- Written by hand: Prisma cannot express text_pattern_ops, and without it LIKE
-- ignores the index and reads the whole table — slower than the recursion this
-- replaces. Including "type" makes counting a subtree an index-only scan, which
-- is where the speed comes from.
CREATE INDEX "node_path_type_idx" ON "node"("path" text_pattern_ops, "type");
