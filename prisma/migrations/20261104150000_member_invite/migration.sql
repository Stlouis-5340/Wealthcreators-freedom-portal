-- CreateTable
CREATE TABLE "MemberInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "tokenHash" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "guideId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberInvite_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberInvite_tokenHash_key" ON "MemberInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "MemberInvite_email_idx" ON "MemberInvite"("email");

-- CreateIndex
CREATE INDEX "MemberInvite_createdById_idx" ON "MemberInvite"("createdById");

-- CreateIndex
CREATE INDEX "MemberInvite_guideId_idx" ON "MemberInvite"("guideId");
