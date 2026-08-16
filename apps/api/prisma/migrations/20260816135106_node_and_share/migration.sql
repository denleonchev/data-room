-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('FOLDER', 'FILE');

-- CreateEnum
CREATE TYPE "ShareMode" AS ENUM ('PUBLIC_LINK');

-- CreateEnum
CREATE TYPE "ShareRole" AS ENUM ('VIEWER');

-- CreateTable
CREATE TABLE "node" (
    "id" TEXT NOT NULL,
    "type" "NodeType" NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "mode" "ShareMode" NOT NULL,
    "role" "ShareRole" NOT NULL DEFAULT 'VIEWER',
    "token" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "share_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "node_ownerId_idx" ON "node"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "node_parentId_name_key" ON "node"("parentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "share_token_key" ON "share"("token");

-- CreateIndex
CREATE INDEX "share_nodeId_idx" ON "share"("nodeId");

-- AddForeignKey
ALTER TABLE "node" ADD CONSTRAINT "node_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node" ADD CONSTRAINT "node_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share" ADD CONSTRAINT "share_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One Data Room per user: a room is a node without a parent. Written by hand —
-- Prisma has no syntax for a partial index, so `migrate dev` doesn't know this
-- one exists and will try to DROP it in the next generated migration. Delete
-- that statement when it shows up.
CREATE UNIQUE INDEX "node_ownerId_root_key" ON "node"("ownerId") WHERE "parentId" IS NULL;
