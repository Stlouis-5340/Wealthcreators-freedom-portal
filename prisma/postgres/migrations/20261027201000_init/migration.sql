-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "lastActive" TEXT NOT NULL DEFAULT '',
    "coachingNote" TEXT NOT NULL DEFAULT '',
    "rosterSort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideAssignment" (
    "guideId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GuideAssignment_pkey" PRIMARY KEY ("guideId","memberId")
);

-- CreateTable
CREATE TABLE "ExpenseLine" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthly" DOUBLE PRECISION NOT NULL,
    "note" TEXT NOT NULL,
    "sort" INTEGER NOT NULL,

    CONSTRAINT "ExpenseLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassiveStream" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthly" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "sort" INTEGER NOT NULL,

    CONSTRAINT "PassiveStream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetLine" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "sort" INTEGER NOT NULL,

    CONSTRAINT "AssetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiabilityLine" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "note" TEXT NOT NULL,
    "sort" INTEGER NOT NULL,

    CONSTRAINT "LiabilityLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "progressSource" TEXT NOT NULL,
    "baseline" DOUBLE PRECISION,
    "baselineLabel" TEXT,
    "target" DOUBLE PRECISION,
    "targetLabel" TEXT NOT NULL,
    "sort" INTEGER NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkpoint" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "calendarYear" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION,
    "sort" INTEGER NOT NULL,

    CONSTRAINT "Checkpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaidItem" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL DEFAULT '',
    "institutionName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaidItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaidAccount" (
    "id" TEXT NOT NULL,
    "itemRecordId" TEXT NOT NULL,
    "plaidAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subtype" TEXT NOT NULL DEFAULT '',
    "mask" TEXT NOT NULL DEFAULT '',
    "balance" DOUBLE PRECISION NOT NULL,
    "assetLineId" TEXT,
    "liabilityLineId" TEXT,

    CONSTRAINT "PlaidAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalStep" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL,
    "sort" INTEGER NOT NULL,

    CONSTRAINT "GoalStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ExpenseLine_memberId_idx" ON "ExpenseLine"("memberId");

-- CreateIndex
CREATE INDEX "PassiveStream_memberId_idx" ON "PassiveStream"("memberId");

-- CreateIndex
CREATE INDEX "AssetLine_memberId_idx" ON "AssetLine"("memberId");

-- CreateIndex
CREATE INDEX "LiabilityLine_memberId_idx" ON "LiabilityLine"("memberId");

-- CreateIndex
CREATE INDEX "Goal_memberId_idx" ON "Goal"("memberId");

-- CreateIndex
CREATE INDEX "Checkpoint_goalId_idx" ON "Checkpoint"("goalId");

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

-- CreateIndex
CREATE INDEX "GoalStep_goalId_idx" ON "GoalStep"("goalId");

-- AddForeignKey
ALTER TABLE "GuideAssignment" ADD CONSTRAINT "GuideAssignment_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideAssignment" ADD CONSTRAINT "GuideAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseLine" ADD CONSTRAINT "ExpenseLine_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassiveStream" ADD CONSTRAINT "PassiveStream_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetLine" ADD CONSTRAINT "AssetLine_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiabilityLine" ADD CONSTRAINT "LiabilityLine_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkpoint" ADD CONSTRAINT "Checkpoint_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaidItem" ADD CONSTRAINT "PlaidItem_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaidAccount" ADD CONSTRAINT "PlaidAccount_itemRecordId_fkey" FOREIGN KEY ("itemRecordId") REFERENCES "PlaidItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalStep" ADD CONSTRAINT "GoalStep_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

