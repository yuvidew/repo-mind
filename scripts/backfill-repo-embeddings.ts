import "dotenv/config";

import prisma from "../src/lib/db";
import {
  embedAndPersistRepoChunks,
  isRepoEmbeddingConfigured,
  type RepoChunkEmbeddingInput,
} from "../src/lib/repos/repo-embeddings";

const DEFAULT_LIMIT = 200;

type BackfillChunk = RepoChunkEmbeddingInput;

async function main() {
  if (!isRepoEmbeddingConfigured()) {
    throw new Error(
      "Set EMBEDDING_API_KEY and EMBEDDING_MODEL before backfill.",
    );
  }

  const repoId = readArg("--repoId");
  const limit = Number(readArg("--limit") ?? DEFAULT_LIMIT);

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("--limit must be a positive integer.");
  }

  const chunks = repoId
    ? await prisma.$queryRaw<BackfillChunk[]>`
        SELECT "id", "path", "startLine", "endLine", "content", "source"
        FROM "RepoChunk"
        WHERE "repoId" = ${repoId}
          AND "embedding" IS NULL
        ORDER BY "createdAt" ASC
        LIMIT ${limit}
      `
    : await prisma.$queryRaw<BackfillChunk[]>`
        SELECT "id", "path", "startLine", "endLine", "content", "source"
        FROM "RepoChunk"
        WHERE "embedding" IS NULL
        ORDER BY "createdAt" ASC
        LIMIT ${limit}
      `;

  if (!chunks.length) {
    console.log("No RepoChunk rows need embedding backfill.");
    return;
  }

  const embeddedChunkIds = await embedAndPersistRepoChunks(chunks);

  console.log(`Backfilled ${embeddedChunkIds.length} RepoChunk embeddings.`);
}

function readArg(name: string) {
  const index = process.argv.indexOf(name);

  if (index === -1) return undefined;

  return process.argv[index + 1];
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
