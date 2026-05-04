import "server-only";

import type { AnalysisMode, RepositoryAnalysis } from "@/lib/analysis-types";
import prisma from "@/lib/db";
import { analyzeRepository } from "@/lib/repo-analyzer";
import { fetchGitHubRepoMetadata } from "./github";
import { parseGitHubRepoUrl } from "./repo-url";

type RepoProgressStatus = "FETCHING" | "PARSING" | "REPORTING";

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

export async function resetRepoAnalysis(input: {
  mode: AnalysisMode;
  repoId: string;
  userId: string;
}) {
  await prisma.chatMessage.deleteMany({
    where: {
      repoId: input.repoId,
      userId: input.userId,
    },
  });

  return prisma.repo.update({
    where: {
      id: input.repoId,
      userId: input.userId,
    },
    data: {
      analysisMode: input.mode,
      errorMsg: null,
      progress: 5,
      status: "PENDING",
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
    await markRepoProgress({
      repoId: input.repoId,
      progress: 20,
      status: "FETCHING",
    });
    await markRepoProgress({
      repoId: input.repoId,
      progress: 45,
      status: "PARSING",
    });
    await markRepoProgress({
      repoId: input.repoId,
      progress: 70,
      status: "REPORTING",
    });

    const analysis = await runRepoAnalysis(input);
    await persistRepoAnalysis({ analysis, repoId: input.repoId });
  } catch (error) {
    await markRepoFailed({ error, repoId: input.repoId });
    throw error;
  }
}

export async function markRepoProgress(input: {
  errorMsg?: string | null;
  progress: number;
  repoId: string;
  status: RepoProgressStatus;
}) {
  await prisma.repo.update({
    where: { id: input.repoId },
    data: {
      errorMsg: input.errorMsg ?? null,
      progress: input.progress,
      status: input.status,
    },
  });
}

export async function runRepoAnalysis(input: {
  mode: AnalysisMode;
  repoId: string;
  userId: string;
}) {
  const repo = await getRepoForUser({ id: input.repoId, userId: input.userId });

  if (!repo) {
    throw new Error("Repository not found.");
  }

  return analyzeRepository(repo.url, {
    mode: input.mode,
    onProgress: async (progress) => {
      await markRepoProgress({
        repoId: input.repoId,
        progress,
        status: "REPORTING",
      });
    },
  });
}

export async function markRepoFailed(input: {
  error: unknown;
  repoId: string;
}) {
  const message =
    input.error instanceof Error
      ? input.error.message
      : "Unable to analyze this repository.";

  await prisma.repo.update({
    where: { id: input.repoId },
    data: {
      errorMsg: message,
      progress: 100,
      status: "FAILED",
    },
  });
}

export async function persistRepoAnalysis(input: {
  analysis: RepositoryAnalysis;
  repoId: string;
}) {
  const selectedFiles = input.analysis.debug.selectedFiles;
  const sampledFiles = input.analysis.debug.sampledFiles ?? [];
  const keyFileByPath = new Map(
    input.analysis.keyFiles.map((file) => [file.path, file.purpose]),
  );
  const fileRows = new Map<string, { content?: string; summary?: string }>();

  for (const file of sampledFiles) {
    fileRows.set(file.path, {
      content: file.content,
      summary: keyFileByPath.get(file.path),
    });
  }

  for (const file of input.analysis.keyFiles) {
    fileRows.set(file.path, {
      ...fileRows.get(file.path),
      summary: file.purpose,
    });
  }

  await prisma.repoChunk.deleteMany({ where: { repoId: input.repoId } });
  await prisma.file.deleteMany({ where: { repoId: input.repoId } });

  const createdFiles = new Map<string, string>();

  for (const [path, file] of fileRows) {
    const createdFile = await prisma.file.create({
      data: {
        content: file.content,
        repoId: input.repoId,
        path,
        summary: file.summary,
        sizeBytes: file.content?.length ?? 0,
      },
      select: { id: true, path: true },
    });

    createdFiles.set(createdFile.path, createdFile.id);
  }

  for (const section of input.analysis.wikiSections.slice(0, 12)) {
    await prisma.file
      .create({
        data: {
          repoId: input.repoId,
          path: `report/${slugify(section.title)}.md`,
          summary: section.content,
        },
      })
      .catch(() => null);
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

  for (const section of input.analysis.wikiSections.slice(0, 10)) {
    await prisma.repoChunk.create({
      data: {
        repoId: input.repoId,
        path: `report/${slugify(section.title)}.md`,
        content: `${section.title}\n\n${section.content}`,
        source: "report-section",
        tokenEstimate: Math.ceil(section.content.length / 4),
      },
    });
  }

  for (const file of sampledFiles.slice(0, 80)) {
    await prisma.repoChunk.create({
      data: {
        repoId: input.repoId,
        fileId: createdFiles.get(file.path),
        path: file.path,
        content: file.content,
        source: "sampled-source",
        tokenEstimate: Math.ceil(file.content.length / 4),
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
