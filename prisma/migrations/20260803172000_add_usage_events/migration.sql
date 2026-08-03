-- CreateEnum
CREATE TYPE "UsageEventType" AS ENUM ('REPO_ANALYSIS', 'CHAT_MESSAGE');

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repoId" TEXT,
    "type" "UsageEventType" NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsageEvent_userId_type_createdAt_idx" ON "UsageEvent"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "UsageEvent_repoId_type_createdAt_idx" ON "UsageEvent"("repoId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
