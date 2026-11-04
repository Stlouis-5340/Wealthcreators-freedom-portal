-- CreateTable
CREATE TABLE "CoachThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoachThread_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoachMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoachMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CoachThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FreedomActionPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "actions" TEXT NOT NULL,
    "previousActions" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'generated',
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regeneratedAt" DATETIME,
    CONSTRAINT "FreedomActionPlan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CoachThread_memberId_idx" ON "CoachThread"("memberId");

-- CreateIndex
CREATE INDEX "CoachMessage_threadId_createdAt_idx" ON "CoachMessage"("threadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FreedomActionPlan_memberId_monthKey_key" ON "FreedomActionPlan"("memberId", "monthKey");

-- CreateIndex
CREATE INDEX "FreedomActionPlan_memberId_idx" ON "FreedomActionPlan"("memberId");
