import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type {
  AnalysisMode,
  FreshnessStatus,
  RepositoryAnalysis,
} from "@/lib/analysis-types";
import prisma from "@/lib/db";
import { analyzeRepository } from "@/lib/repo-analyzer";
import {
  fetchGitHubBranchCommitSha,
  fetchGitHubRawFile,
  fetchGitHubRepoMetadata,
} from "./github";
import { tryEmbedAndPersistRepoChunks } from "./repo-embeddings";
import { parseGitHubRepoUrl } from "./repo-url";

type RepoProgressStatus = "FETCHING" | "PARSING" | "REPORTING";

type CreateRepoInput = {
  mode: AnalysisMode;
  url: string;
  userId: string;
};

type RepoChunkCreateInput = {
  content: string;
  endLine?: number;
  fileId?: string;
  path: string;
  repoId: string;
  source: string;
  startLine?: number;
  tokenEstimate: number;
};

const SOURCE_CHUNK_MAX_LINES = 80;
const SOURCE_CHUNK_OVERLAP_LINES = 12;
const SOURCE_CHUNK_MAX_CHARS = 5_000;

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
      freshnessStatus: "unknown",
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
      freshnessStatus: "unknown",
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

export async function listRepoFilesForUser(input: {
  repoId: string;
  userId: string;
}) {
  const repo = await getRepoForUser({ id: input.repoId, userId: input.userId });

  if (!repo) return null;

  return prisma.file.findMany({
    where: { repoId: input.repoId },
    orderBy: { path: "asc" },
    select: {
      id: true,
      isBinary: true,
      language: true,
      path: true,
      sha: true,
      sizeBytes: true,
      skippedReason: true,
      summary: true,
      updatedAt: true,
    },
  });
}

export async function getRepoFileForUser(input: {
  path: string;
  repoId: string;
  userId: string;
}) {
  const repo = await getRepoForUser({ id: input.repoId, userId: input.userId });

  if (!repo) return null;

  return prisma.file.findUnique({
    where: {
      repoId_path: {
        repoId: input.repoId,
        path: input.path,
      },
    },
    select: {
      content: true,
      id: true,
      isBinary: true,
      language: true,
      path: true,
      sha: true,
      sizeBytes: true,
      skippedReason: true,
      summary: true,
      updatedAt: true,
    },
  });
}

export async function getRepoFileWithLazyContentForUser(input: {
  path: string;
  repoId: string;
  userId: string;
}) {
  const repo = await getRepoForUser({ id: input.repoId, userId: input.userId });

  if (!repo) return null;

  const file = await getRepoFileForUser(input);

  if (!file || file.content || file.isBinary || file.skippedReason) {
    return file;
  }

  const content = await fetchGitHubRawFile({
    branch: repo.analyzedCommitSha ?? repo.branch,
    name: repo.name,
    owner: repo.owner,
    path: file.path,
  });

  if (!content) return file;

  const updatedFile = await prisma.file.update({
    where: {
      repoId_path: {
        repoId: input.repoId,
        path: input.path,
      },
    },
    data: {
      content,
      sizeBytes: content.length,
    },
    select: {
      content: true,
      id: true,
      isBinary: true,
      language: true,
      path: true,
      sha: true,
      sizeBytes: true,
      skippedReason: true,
      summary: true,
      updatedAt: true,
    },
  });

  await createRepoChunksWithEmbeddings(
    buildSourceChunks({
      content,
      fileId: updatedFile.id,
      path: updatedFile.path,
      repoId: input.repoId,
      source: "lazy-github-source",
    }),
  );

  return updatedFile;
}

export async function refreshRepoFreshnessForUser(input: {
  repoId: string;
  userId: string;
}) {
  const repo = await getRepoForUser({ id: input.repoId, userId: input.userId });

  if (!repo) return null;

  const latestCommitSha = await fetchGitHubBranchCommitSha({
    branch: repo.branch,
    name: repo.name,
    owner: repo.owner,
  });
  const freshnessStatus = getFreshnessStatus({
    analyzedCommitSha: repo.analyzedCommitSha,
    latestCommitSha,
  });
  const reportJson = updateReportFreshness(repo.reportJson, {
    freshnessStatus,
    latestCommitSha,
  });

  return prisma.repo.update({
    where: { id: input.repoId },
    data: {
      freshnessStatus,
      lastFreshnessCheckAt: new Date(),
      latestCommitSha,
      reportJson,
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
  const fileRows = new Map<
    string,
    { content?: string; sha?: string; summary?: string }
  >();

  for (const file of sampledFiles) {
    fileRows.set(file.path, {
      content: file.content,
      summary: keyFileByPath.get(file.path),
      sha: file.sha,
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
        sha: file.sha,
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

  const chunksToCreate: RepoChunkCreateInput[] = [
    ...input.analysis.keyFiles.slice(0, 12).map((file) => ({
      repoId: input.repoId,
      path: file.path,
      content: file.purpose,
      source: "report-key-file",
      tokenEstimate: Math.ceil(file.purpose.length / 4),
    })),
    ...input.analysis.wikiSections.slice(0, 10).map((section) => {
      const content = `${section.title}\n\n${section.content}`;

      return {
        repoId: input.repoId,
        path: `report/${slugify(section.title)}.md`,
        content,
        source: "report-section",
        tokenEstimate: Math.ceil(content.length / 4),
      };
    }),
    ...sampledFiles.slice(0, 80).flatMap((file) =>
      buildSourceChunks({
        repoId: input.repoId,
        fileId: createdFiles.get(file.path),
        path: file.path,
        content: file.content,
        source: "sampled-source",
      }),
    ),
  ];

  await createRepoChunksWithEmbeddings(chunksToCreate);

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
      analysisPromptVersion: input.analysis.provenance.promptVersion,
      analyzedCommitSha: input.analysis.provenance.analyzedCommitSha,
      latestCommitSha: input.analysis.provenance.latestCommitSha,
      freshnessStatus: input.analysis.provenance.freshnessStatus,
      lastFreshnessCheckAt: new Date(),
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

function buildSourceChunks(input: {
  content: string;
  fileId?: string;
  path: string;
  repoId: string;
  source: string;
}): RepoChunkCreateInput[] {
  const lines = input.content.split(/\r?\n/);
  const chunks: RepoChunkCreateInput[] = [];
  let startIndex = 0;

  while (startIndex < lines.length) {
    let endIndex = startIndex;
    let content = "";

    while (
      endIndex < lines.length &&
      endIndex - startIndex < SOURCE_CHUNK_MAX_LINES
    ) {
      const nextContent = [...lines.slice(startIndex, endIndex + 1)].join("\n");

      if (nextContent.length > SOURCE_CHUNK_MAX_CHARS && content) break;

      content = nextContent;
      endIndex += 1;
    }

    const trimmedContent = content.trimEnd();

    if (trimmedContent) {
      chunks.push({
        content: trimmedContent,
        endLine: endIndex,
        fileId: input.fileId,
        path: input.path,
        repoId: input.repoId,
        source: input.source,
        startLine: startIndex + 1,
        tokenEstimate: Math.ceil(trimmedContent.length / 4),
      });
    }

    if (endIndex >= lines.length) break;

    startIndex = Math.max(
      endIndex - SOURCE_CHUNK_OVERLAP_LINES,
      startIndex + 1,
    );
  }

  return chunks;
}

async function createRepoChunksWithEmbeddings(chunks: RepoChunkCreateInput[]) {
  const createdChunks = [];

  for (const chunk of chunks) {
    const createdChunk = await prisma.repoChunk.create({
      data: {
        content: chunk.content,
        endLine: chunk.endLine,
        fileId: chunk.fileId,
        path: chunk.path,
        repoId: chunk.repoId,
        source: chunk.source,
        startLine: chunk.startLine,
        tokenEstimate: chunk.tokenEstimate,
      },
      select: {
        content: true,
        endLine: true,
        id: true,
        path: true,
        source: true,
        startLine: true,
      },
    });

    createdChunks.push(createdChunk);
  }

  await tryEmbedAndPersistRepoChunks(createdChunks);

  return createdChunks;
}

function getFreshnessStatus(input: {
  analyzedCommitSha: string | null;
  latestCommitSha: string | null;
}): FreshnessStatus {
  if (!(input.analyzedCommitSha && input.latestCommitSha)) return "unknown";

  return input.analyzedCommitSha === input.latestCommitSha ? "fresh" : "stale";
}

function updateReportFreshness(
  value: unknown,
  input: {
    freshnessStatus: FreshnessStatus;
    latestCommitSha: string | null;
  },
): Prisma.InputJsonValue | undefined {
  if (!value || typeof value !== "object") return undefined;

  const report = value as RepositoryAnalysis;

  if (!report.provenance) return value as Prisma.InputJsonValue;

  return {
    ...report,
    provenance: {
      ...report.provenance,
      freshnessStatus: input.freshnessStatus,
      latestCommitSha: input.latestCommitSha,
    },
  } as Prisma.InputJsonValue;
}
