-- CreateTable
CREATE TABLE "PlaidItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL DEFAULT '',
    "institutionName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlaidItem_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlaidAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemRecordId" TEXT NOT NULL,
    "plaidAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subtype" TEXT NOT NULL DEFAULT '',
    "mask" TEXT NOT NULL DEFAULT '',
    "balance" REAL NOT NULL,
    "assetLineId" TEXT,
    "liabilityLineId" TEXT,
    CONSTRAINT "PlaidAccount_itemRecordId_fkey" FOREIGN KEY ("itemRecordId") REFERENCES "PlaidItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PlaidItem_itemId_key" ON "PlaidItem"("itemId");

-- CreateIndex
CREATE INDEX "PlaidItem_memberId_idx" ON "PlaidItem"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaidAccount_plaidAccountId_key" ON "PlaidAccount"("plaidAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaidAccount_assetLineId_key" ON "PlaidAccount"("assetLineId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaidAccount_liabilityLineId_key" ON "PlaidAccount"("liabilityLineId");

-- CreateIndex
CREATE INDEX "PlaidAccount_itemRecordId_idx" ON "PlaidAccount"("itemRecordId");
