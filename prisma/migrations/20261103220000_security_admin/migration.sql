-- AlterTable
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "mfaSecretEnc" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "mfaPendingSecretEnc" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "mfaRecoveryHashes" TEXT NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "GuideAccessGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "GuideAccessGrant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GuideAccessGrant_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "meta" TEXT NOT NULL DEFAULT '{}',
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GuideAccessGrant_memberId_idx" ON "GuideAccessGrant"("memberId");

-- CreateIndex
CREATE INDEX "GuideAccessGrant_guideId_idx" ON "GuideAccessGrant"("guideId");

-- CreateIndex
CREATE INDEX "GuideAccessGrant_memberId_guideId_idx" ON "GuideAccessGrant"("memberId", "guideId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");
