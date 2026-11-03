-- AlterTable
ALTER TABLE "AssetLine" ADD COLUMN "valuation" TEXT NOT NULL DEFAULT 'estimated';

-- AlterTable
ALTER TABLE "AssetLine" ADD COLUMN "confirmedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PlaidItem" ADD COLUMN "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
