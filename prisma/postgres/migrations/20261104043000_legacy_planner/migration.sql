-- CreateTable
CREATE TABLE "LegacyPlan" (
    "memberId" TEXT NOT NULL,
    "trustStatus" TEXT NOT NULL DEFAULT 'not_started',
    "trustNotes" TEXT NOT NULL DEFAULT '',
    "educationGoals" TEXT NOT NULL DEFAULT '',
    "charitableIntentions" TEXT NOT NULL DEFAULT '',
    "priorities" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyPlan_pkey" PRIMARY KEY ("memberId")
);

-- CreateTable
CREATE TABLE "LegacyChecklistItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "questions" TEXT NOT NULL DEFAULT '',
    "sort" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyBeneficiary" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'primary',
    "notes" TEXT NOT NULL DEFAULT '',
    "sort" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyBeneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyInsurance" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "carrier" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "notes" TEXT NOT NULL DEFAULT '',
    "sort" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyInsurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyDocument" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "locationNote" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT NOT NULL DEFAULT '',
    "storageKey" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegacyChecklistItem_planId_idx" ON "LegacyChecklistItem"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyChecklistItem_planId_key_key" ON "LegacyChecklistItem"("planId", "key");

-- CreateIndex
CREATE INDEX "LegacyBeneficiary_planId_idx" ON "LegacyBeneficiary"("planId");

-- CreateIndex
CREATE INDEX "LegacyInsurance_planId_idx" ON "LegacyInsurance"("planId");

-- CreateIndex
CREATE INDEX "LegacyDocument_planId_idx" ON "LegacyDocument"("planId");

-- AddForeignKey
ALTER TABLE "LegacyPlan" ADD CONSTRAINT "LegacyPlan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacyChecklistItem" ADD CONSTRAINT "LegacyChecklistItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "LegacyPlan"("memberId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacyBeneficiary" ADD CONSTRAINT "LegacyBeneficiary_planId_fkey" FOREIGN KEY ("planId") REFERENCES "LegacyPlan"("memberId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacyInsurance" ADD CONSTRAINT "LegacyInsurance_planId_fkey" FOREIGN KEY ("planId") REFERENCES "LegacyPlan"("memberId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacyDocument" ADD CONSTRAINT "LegacyDocument_planId_fkey" FOREIGN KEY ("planId") REFERENCES "LegacyPlan"("memberId") ON DELETE CASCADE ON UPDATE CASCADE;

