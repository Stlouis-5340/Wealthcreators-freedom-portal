-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "lastActive" TEXT NOT NULL DEFAULT '',
    "coachingNote" TEXT NOT NULL DEFAULT '',
    "rosterSort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GuideAssignment" (
    "guideId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("guideId", "memberId"),
    CONSTRAINT "GuideAssignment_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GuideAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthly" REAL NOT NULL,
    "note" TEXT NOT NULL,
    "sort" INTEGER NOT NULL,
    CONSTRAINT "ExpenseLine_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PassiveStream" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthly" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "sort" INTEGER NOT NULL,
    CONSTRAINT "PassiveStream_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    "sort" INTEGER NOT NULL,
    CONSTRAINT "AssetLine_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LiabilityLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    "note" TEXT NOT NULL,
    "sort" INTEGER NOT NULL,
    CONSTRAINT "LiabilityLine_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "progressSource" TEXT NOT NULL,
    "baseline" REAL,
    "baselineLabel" TEXT,
    "target" REAL,
    "targetLabel" TEXT NOT NULL,
    "sort" INTEGER NOT NULL,
    CONSTRAINT "Goal_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Checkpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "calendarYear" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "targetValue" REAL,
    "sort" INTEGER NOT NULL,
    CONSTRAINT "Checkpoint_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoalStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL,
    "sort" INTEGER NOT NULL,
    CONSTRAINT "GoalStep_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
CREATE INDEX "GoalStep_goalId_idx" ON "GoalStep"("goalId");
