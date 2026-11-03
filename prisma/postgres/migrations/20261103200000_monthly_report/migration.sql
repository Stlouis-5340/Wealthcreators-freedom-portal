-- CreateTable
CREATE TABLE "MonthlyReport" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "freedomScore" DOUBLE PRECISION,
    "gap" DOUBLE PRECISION,
    "quality" DOUBLE PRECISION,
    "passive" DOUBLE PRECISION,
    "expenses" DOUBLE PRECISION,
    "netWorth" DOUBLE PRECISION,
    "yieldOnAssets" DOUBLE PRECISION,
    "goalsSummary" TEXT NOT NULL,
    "milestones" TEXT NOT NULL,
    "actions" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyReport_memberId_idx" ON "MonthlyReport"("memberId");

-- CreateIndex
CREATE INDEX "MonthlyReport_monthKey_idx" ON "MonthlyReport"("monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReport_memberId_monthKey_key" ON "MonthlyReport"("memberId", "monthKey");

-- AddForeignKey
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
