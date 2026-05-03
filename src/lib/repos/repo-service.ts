import "server-only";

import type { AnalysisMode, RepositoryAnalysis } from "@/lib/analysis-types";
import prisma from "@/lib/db";
import { analyzeRepository } from "@/lib/repo-analyzer";
import { fetchGitHubRepoMetadata } from "./github";
import { parseGitHubRepoUrl } from "./repo-url";

type CreateRepoInput = {
  mode: AnalysisMode;
  url: string;
  userId: string;
};

export async function createRepoForUser(input: CreateRepoInput) {
  const parsed = parseGitHubRepoUrl(input.url);

  if (!parsed) {
    throw new Error("Enter a valid GitHub repository URL.");
  }

  const metadata = await fetchGitHubRepoMetadata(parsed.owner, parsed.name);
  const repo = await prisma.repo.upsert({
    where: {
      userId_owner_name_branch: {
        userId: input.userId,
        owner: parsed.owner,
        name: parsed.name,
        branch: metadata.default_branch,
      },
    },
    create: {
      userId: input.userId,
      url: metadata.html_url || parsed.normalizedUrl,
      owner: parsed.owner,
      name: metadata.name || parsed.name,
      branch: metadata.default_branch,
      visibility: metadata.private ? "Private" : "Public",
      description: metadata.description,
      language: metadata.language,
      status: "PENDING",
      progress: 5,
      analysisMode: input.mode,
    },
    update: {
      url: metadata.html_url || parsed.normalizedUrl,
      visibility: metadata.private ? "Private" : "Public",
      description: metadata.description,
      language: metadata.language,
      status: "PENDING",
      progress: 5,
      errorMsg: null,
      analysisMode: input.mode,
    },
  });

  return repo;
}

export async function listReposForUser(userId: string) {
  return prisma.repo.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getRepoForUser(input: { id: string; userId: string }) {
  return prisma.repo.findFirst({
    where: {
      id: input.id,
      userId: input.userId,
    },
  });
}

export async function analyzeAndPersistRepo(input: {
  mode: AnalysisMode;
  repoId: string;
  userId: string;
}) {
  const repo = await getRepoForUser({ id: input.repoId, userId: input.userId });

  if (!repo) {
    throw new Error("Repository not found.");
  }

  try {
    await updateRepoProgress(input.repoId, "FETCHING", 20, null);
    await updateRepoProgress(input.repoId, "PARSING", 45, null);
    await updateRepoProgress(input.repoId, "REPORTING", 70, null);

    const analysis = await analyzeRepository(repo.url, { mode: input.mode });
    await persistAnalysis({ analysis, repoId: input.repoId });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to analyze this repository.";

    await prisma.repo.update({
      where: { id: input.repoId },
      data: {
        errorMsg: message,
        progress: 100,
        status: "FAILED",
      },
    });

    throw error;
  }
}

async function updateRepoProgress(
  repoId: string,
  status: "FETCHING" | "PARSING" | "REPORTING",
  progress: number,
  errorMsg: string | null,
) {
  await prisma.repo.update({
    where: { id: repoId },
    data: { errorMsg, progress, status },
  });
}

async function persistAnalysis(input: {
  analysis: RepositoryAnalysis;
  repoId: string;
}) {
  const selectedFiles = input.analysis.debug.selectedFiles;

  await prisma.repoChunk.deleteMany({ where: { repoId: input.repoId } });
  await prisma.file.deleteMany({ where: { repoId: input.repoId } });

  for (const file of input.analysis.keyFiles) {
    await prisma.file.create({
      data: {
        repoId: input.repoId,
        path: file.path,
        summary: file.purpose,
      },
    });
  }

  for (const file of input.analysis.keyFiles.slice(0, 12)) {
    await prisma.repoChunk.create({
      data: {
        repoId: input.repoId,
        path: file.path,
        content: file.purpose,
        source: "report-key-file",
        tokenEstimate: Math.ceil(file.purpose.length / 4),
      },
    });
  }

  await prisma.repo.update({
    where: { id: input.repoId },
    data: {
      branch: input.analysis.repo.defaultBranch,
      description: input.analysis.repo.description,
      errorMsg: null,
      fileCount: input.analysis.repo.fileCount,
      graphJson: input.analysis.diagram,
      language: input.analysis.repo.language,
      lastAnalyzedAt: new Date(),
      progress: 100,
      reportJson: input.analysis,
      selectedFilesJson: selectedFiles,
      status: "READY",
      totalBytes: 0,
      analysisProvider: input.analysis.debug.provider,
      analysisModel: input.analysis.debug.model,
    },
  });
}
