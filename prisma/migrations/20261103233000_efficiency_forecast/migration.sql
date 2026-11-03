-- AlterTable
ALTER TABLE "AssetLine" ADD COLUMN "capitalRole" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "ScenarioRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assumptions" TEXT NOT NULL,
    "outputs" TEXT NOT NULL,
    "sharedWithGuide" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScenarioRun_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ScenarioRun_memberId_idx" ON "ScenarioRun"("memberId");

-- CreateIndex
CREATE INDEX "ScenarioRun_memberId_sharedWithGuide_idx" ON "ScenarioRun"("memberId", "sharedWithGuide");
