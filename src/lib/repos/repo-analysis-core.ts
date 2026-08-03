import type { FreshnessStatus } from "@/lib/analysis-types";
import { isPublicAppError } from "@/lib/public-errors";

export type RepoChunkCreateInput = {
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

export function getRepoFailureMessage(error: unknown) {
  if (isPublicAppError(error)) return error.message;
  if (isGitHubRequestErrorLike(error)) return error.message;

  if (error instanceof Error) {
    if (
      error.message === "Repository not found." ||
      error.message.startsWith("Repository saved, but")
    ) {
      return error.message;
    }
  }

  return "Analysis failed before RepoMind could finish. Retry in a moment; if it keeps happening, check GitHub access and model configuration.";
}

export function getFreshnessStatus(input: {
  analyzedCommitSha: string | null;
  latestCommitSha: string | null;
}): FreshnessStatus {
  if (!(input.analyzedCommitSha && input.latestCommitSha)) return "unknown";

  return input.analyzedCommitSha === input.latestCommitSha ? "fresh" : "stale";
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function buildSourceChunks(input: {
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

function isGitHubRequestErrorLike(
  error: unknown,
): error is { message: string; name: "GitHubRequestError" } {
  return (
    error instanceof Error &&
    error.name === "GitHubRequestError" &&
    typeof error.message === "string"
  );
}
