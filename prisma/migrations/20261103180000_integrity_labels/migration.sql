-- AlterTable
ALTER TABLE "AssetLine" ADD COLUMN "valuation" TEXT NOT NULL DEFAULT 'estimated';

-- AlterTable
ALTER TABLE "AssetLine" ADD COLUMN "confirmedAt" DATETIME;

-- AlterTable
ALTER TABLE "PlaidItem" ADD COLUMN "refreshedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
