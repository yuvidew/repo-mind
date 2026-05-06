-- AlterTable
ALTER TABLE "Repo" ADD COLUMN "analyzedCommitSha" TEXT;
ALTER TABLE "Repo" ADD COLUMN "latestCommitSha" TEXT;
ALTER TABLE "Repo" ADD COLUMN "freshnessStatus" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "Repo" ADD COLUMN "lastFreshnessCheckAt" TIMESTAMP(3);
