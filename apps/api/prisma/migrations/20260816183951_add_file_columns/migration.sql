-- File-only columns arriving in slice 3: size, mimeType and storageKey sit
-- empty on folder rows, the same tradeoff the one-table design already takes
-- for path/name. storageKey is unique because it is always the node's own id
-- today, and nothing should ever be able to point two rows at one object.
--
-- Written by hand rather than via `prisma migrate diff`: the raw diff against
-- the live database also proposed dropping node_path_type_idx, the
-- text_pattern_ops index from the previous migration that Prisma cannot
-- express in schema.prisma and so doesn't know about — that line is excluded
-- here.

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'READY');

-- AlterTable
ALTER TABLE "node" ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "size" INTEGER,
ADD COLUMN     "status" "FileStatus",
ADD COLUMN     "storageKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "node_storageKey_key" ON "node"("storageKey");
