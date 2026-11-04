-- CreateTable
CREATE TABLE "CoachThread" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreedomActionPlan" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "actions" TEXT NOT NULL,
    "previousActions" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'generated',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regeneratedAt" TIMESTAMP(3),

    CONSTRAINT "FreedomActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachThread_memberId_idx" ON "CoachThread"("memberId");

-- CreateIndex
CREATE INDEX "CoachMessage_threadId_createdAt_idx" ON "CoachMessage"("threadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FreedomActionPlan_memberId_monthKey_key" ON "FreedomActionPlan"("memberId", "monthKey");

-- CreateIndex
CREATE INDEX "FreedomActionPlan_memberId_idx" ON "FreedomActionPlan"("memberId");

-- AddForeignKey
ALTER TABLE "CoachThread" ADD CONSTRAINT "CoachThread_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachMessage" ADD CONSTRAINT "CoachMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CoachThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreedomActionPlan" ADD CONSTRAINT "FreedomActionPlan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
