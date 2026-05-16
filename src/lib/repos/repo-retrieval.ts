import "server-only";

import prisma from "@/lib/db";
import {
  embedRepoQuery,
  formatPgVector,
  isRepoEmbeddingConfigured,
} from "./repo-embeddings";

export type RetrievedRepoChunk = {
  content: string;
  endLine: number | null;
  id: string;
  path: string;
  similarity: number | null;
  source: string;
  startLine: number | null;
};

const DEFAULT_RETRIEVAL_LIMIT = 14;
const FALLBACK_RETRIEVAL_LIMIT = 80;

export async function retrieveRepoChunks(input: {
  limit?: number;
  question: string;
  repoId: string;
  userId: string;
}): Promise<RetrievedRepoChunk[]> {
  const repo = await prisma.repo.findFirst({
    where: { id: input.repoId, userId: input.userId },
    select: { id: true },
  });

  if (!repo) return [];

  if (!isRepoEmbeddingConfigured()) {
    return retrieveFallbackChunks(input);
  }

  try {
    const vector = await embedRepoQuery(input.question);
    const vectorLiteral = formatPgVector(vector);
    const limit = input.limit ?? DEFAULT_RETRIEVAL_LIMIT;
    const chunks = await prisma.$queryRaw<RetrievedRepoChunk[]>`
      SELECT
        "id",
        "path",
        "startLine",
        "endLine",
        "content",
        "source",
        1 - ("embedding" <=> ${vectorLiteral}::vector) AS "similarity"
      FROM "RepoChunk"
      WHERE "repoId" = ${input.repoId}
        AND "embedding" IS NOT NULL
      ORDER BY "embedding" <=> ${vectorLiteral}::vector
      LIMIT ${limit}
    `;

    if (chunks.length) return chunks;
  } catch (error) {
    console.warn("Repo vector retrieval failed; using fallback retrieval", {
      error: error instanceof Error ? error.message : "Unknown retrieval error",
    });
  }

  return retrieveFallbackChunks(input);
}

async function retrieveFallbackChunks(input: {
  question: string;
  repoId: string;
}) {
  const chunks = await prisma.repoChunk.findMany({
    where: { repoId: input.repoId },
    orderBy: { createdAt: "asc" },
    take: FALLBACK_RETRIEVAL_LIMIT,
    select: {
      content: true,
      endLine: true,
      id: true,
      path: true,
      source: true,
      startLine: true,
    },
  });

  return prioritizeChunks(chunks, input.question)
    .slice(0, DEFAULT_RETRIEVAL_LIMIT)
    .map((chunk) => ({ ...chunk, similarity: null }));
}

function prioritizeChunks(
  chunks: Omit<RetrievedRepoChunk, "similarity">[],
  question: string,
) {
  return [...chunks].sort((first, second) => {
    return chunkScore(second, question) - chunkScore(first, question);
  });
}

function chunkScore(
  chunk: Omit<RetrievedRepoChunk, "similarity">,
  question: string,
) {
  const lowerPath = chunk.path.toLowerCase();
  const lowerContent = chunk.content.toLowerCase();
  const questionTokens = extractQuestionTokens(question);
  let score = 0;

  if (chunk.source.includes("source")) score += 40;
  if (lowerPath.endsWith("package.json")) score += 35;
  if (lowerPath.includes("schema.prisma")) score += 35;
  if (lowerPath.includes("prisma.config")) score += 30;
  if (lowerPath.includes("lib/db") || lowerPath.includes("database")) {
    score += 30;
  }
  if (lowerPath.includes("api/") || lowerPath.endsWith("route.ts")) {
    score += 15;
  }

  for (const token of questionTokens) {
    if (lowerPath.includes(token)) score += 18;
    if (lowerContent.includes(token)) score += 8;
  }

  return score;
}

function extractQuestionTokens(question: string) {
  const stopWords = new Set([
    "about",
    "after",
    "does",
    "first",
    "from",
    "have",
    "into",
    "read",
    "should",
    "that",
    "this",
    "what",
    "when",
    "where",
    "which",
    "with",
  ]);

  return Array.from(
    new Set(
      question
        .toLowerCase()
        .split(/[^a-z0-9_/-]+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 2 && !stopWords.has(token)),
    ),
  ).slice(0, 16);
}
