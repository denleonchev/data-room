-- AlterEnum
ALTER TYPE "ShareMode" ADD VALUE 'RESTRICTED';

-- DropIndex
DROP INDEX "share_nodeId_idx";

-- AlterTable
ALTER TABLE "share" ADD COLUMN     "granteeEmail" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "share_nodeId_granteeEmail_key" ON "share"("nodeId", "granteeEmail");
