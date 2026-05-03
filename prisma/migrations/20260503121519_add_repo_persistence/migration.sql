/*
  Warnings:

  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "RepoStatus" AS ENUM ('PENDING', 'FETCHING', 'PARSING', 'REPORTING', 'READY', 'FAILED');

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_authorId_fkey";

-- DropTable
DROP TABLE "Post";

-- CreateTable
CREATE TABLE "Repo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'Public',
    "description" TEXT,
    "language" TEXT,
    "status" "RepoStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "errorMsg" TEXT,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "totalBytes" INTEGER NOT NULL DEFAULT 0,
    "reportJson" JSONB,
    "graphJson" JSONB,
    "analysisMode" TEXT NOT NULL DEFAULT 'fast',
    "analysisProvider" TEXT,
    "analysisModel" TEXT,
    "analysisPromptVersion" TEXT NOT NULL DEFAULT 'v1',
    "selectedFilesJson" JSONB,
    "lastAnalyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "language" TEXT,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "sha" TEXT,
    "isBinary" BOOLEAN NOT NULL DEFAULT false,
    "skippedReason" TEXT,
    "content" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepoChunk" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "fileId" TEXT,
    "path" TEXT NOT NULL,
    "startLine" INTEGER,
    "endLine" INTEGER,
    "content" TEXT NOT NULL,
    "tokenEstimate" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'analysis',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepoChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Repo_userId_status_idx" ON "Repo"("userId", "status");

-- CreateIndex
CREATE INDEX "Repo_userId_updatedAt_idx" ON "Repo"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Repo_userId_owner_name_branch_key" ON "Repo"("userId", "owner", "name", "branch");

-- CreateIndex
CREATE INDEX "File_repoId_idx" ON "File"("repoId");

-- CreateIndex
CREATE UNIQUE INDEX "File_repoId_path_key" ON "File"("repoId", "path");

-- CreateIndex
CREATE INDEX "RepoChunk_repoId_idx" ON "RepoChunk"("repoId");

-- CreateIndex
CREATE INDEX "RepoChunk_fileId_idx" ON "RepoChunk"("fileId");

-- CreateIndex
CREATE INDEX "RepoChunk_repoId_path_idx" ON "RepoChunk"("repoId", "path");

-- AddForeignKey
ALTER TABLE "Repo" ADD CONSTRAINT "Repo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepoChunk" ADD CONSTRAINT "RepoChunk_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepoChunk" ADD CONSTRAINT "RepoChunk_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
