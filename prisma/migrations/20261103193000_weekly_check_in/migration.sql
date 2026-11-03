-- CreateTable
CREATE TABLE "WeeklyCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "win" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "actionStatus" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "needsSupport" BOOLEAN NOT NULL,
    "supportNote" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL,
    "freedomScore" REAL,
    "monthlyFreedomGap" REAL,
    "qualityScore" REAL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WeeklyCheckIn_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoachingNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoachingNote_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoachingNote_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoachingTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoachingTask_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoachingTask_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WeeklyCheckIn_memberId_idx" ON "WeeklyCheckIn"("memberId");

-- CreateIndex
CREATE INDEX "WeeklyCheckIn_weekKey_idx" ON "WeeklyCheckIn"("weekKey");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyCheckIn_memberId_weekKey_key" ON "WeeklyCheckIn"("memberId", "weekKey");

-- CreateIndex
CREATE INDEX "CoachingNote_memberId_idx" ON "CoachingNote"("memberId");

-- CreateIndex
CREATE INDEX "CoachingNote_guideId_idx" ON "CoachingNote"("guideId");

-- CreateIndex
CREATE INDEX "CoachingTask_memberId_idx" ON "CoachingTask"("memberId");

-- CreateIndex
CREATE INDEX "CoachingTask_guideId_idx" ON "CoachingTask"("guideId");

-- CreateIndex
CREATE INDEX "CoachingTask_status_idx" ON "CoachingTask"("status");
