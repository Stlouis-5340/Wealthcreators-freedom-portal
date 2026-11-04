-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "verifier" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "ChallengeEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "progress" REAL NOT NULL DEFAULT 0,
    "evidence" TEXT NOT NULL DEFAULT '{}',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChallengeEnrollment_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChallengeEnrollment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccountabilityGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "memberIds" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountabilityGroup_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AccountabilityGroup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LessonCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "lessonKey" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LessonCompletion_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Achievement_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LifeMetrics" (
    "memberId" TEXT NOT NULL PRIMARY KEY,
    "timeFreedomHours" REAL,
    "familyPriority" INTEGER,
    "healthStreakDays" INTEGER,
    "experiencesPlanned" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LifeMetrics_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeEnrollment_challengeId_memberId_key" ON "ChallengeEnrollment"("challengeId", "memberId");

-- CreateIndex
CREATE INDEX "ChallengeEnrollment_memberId_idx" ON "ChallengeEnrollment"("memberId");

-- CreateIndex
CREATE INDEX "ChallengeEnrollment_status_idx" ON "ChallengeEnrollment"("status");

-- CreateIndex
CREATE INDEX "AccountabilityGroup_challengeId_idx" ON "AccountabilityGroup"("challengeId");

-- CreateIndex
CREATE INDEX "AccountabilityGroup_createdById_idx" ON "AccountabilityGroup"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "LessonCompletion_memberId_lessonKey_key" ON "LessonCompletion"("memberId", "lessonKey");

-- CreateIndex
CREATE INDEX "LessonCompletion_memberId_idx" ON "LessonCompletion"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_memberId_key_key" ON "Achievement"("memberId", "key");

-- CreateIndex
CREATE INDEX "Achievement_memberId_idx" ON "Achievement"("memberId");

-- CreateIndex
CREATE INDEX "Achievement_memberId_visibility_idx" ON "Achievement"("memberId", "visibility");
