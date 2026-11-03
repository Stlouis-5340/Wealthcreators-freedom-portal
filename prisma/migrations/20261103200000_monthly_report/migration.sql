-- CreateTable
CREATE TABLE "MonthlyReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "freedomScore" REAL,
    "gap" REAL,
    "quality" REAL,
    "passive" REAL,
    "expenses" REAL,
    "netWorth" REAL,
    "yieldOnAssets" REAL,
    "goalsSummary" TEXT NOT NULL,
    "milestones" TEXT NOT NULL,
    "actions" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonthlyReport_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MonthlyReport_memberId_idx" ON "MonthlyReport"("memberId");

-- CreateIndex
CREATE INDEX "MonthlyReport_monthKey_idx" ON "MonthlyReport"("monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReport_memberId_monthKey_key" ON "MonthlyReport"("memberId", "monthKey");
