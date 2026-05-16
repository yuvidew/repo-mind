import { Embeddings } from "@langchain/core/embeddings";
import { OpenAIEmbeddings } from "@langchain/openai";
import prisma from "@/lib/db";

export const REPO_CHUNK_EMBEDDING_DIMENSIONS = 2048;

const EMBEDDING_BATCH_SIZE = 16;
const EMBEDDING_INPUT_MAX_CHARS = 8_000;

type EmbeddingConfig = {
  apiKey: string;
  baseURL?: string;
  model: string;
};

export type RepoChunkEmbeddingInput = {
  content: string;
  endLine?: number | null;
  id: string;
  path: string;
  source: string;
  startLine?: number | null;
};

export function isRepoEmbeddingConfigured() {
  return Boolean(getEmbeddingConfig());
}

export async function embedRepoQuery(question: string) {
  const embeddings = createEmbeddingsClient();
  const vector = await embeddings.embedQuery(truncateEmbeddingInput(question));

  return normalizeEmbedding(vector);
}

export async function embedAndPersistRepoChunks(
  chunks: RepoChunkEmbeddingInput[],
) {
  const embeddings = createEmbeddingsClient();
  const embeddedChunkIds: string[] = [];

  for (let index = 0; index < chunks.length; index += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(index, index + EMBEDDING_BATCH_SIZE);
    const vectors = await embeddings.embedDocuments(
      batch.map((chunk) => buildChunkEmbeddingText(chunk)),
    );

    await Promise.all(
      vectors.map((vector, vectorIndex) => {
        const chunk = batch[vectorIndex];

        if (!chunk) return Promise.resolve();

        embeddedChunkIds.push(chunk.id);

        return updateRepoChunkEmbedding({
          chunkId: chunk.id,
          vector: normalizeEmbedding(vector),
        });
      }),
    );
  }

  return embeddedChunkIds;
}

export async function tryEmbedAndPersistRepoChunks(
  chunks: RepoChunkEmbeddingInput[],
) {
  if (!chunks.length || !isRepoEmbeddingConfigured()) return [];

  try {
    return await embedAndPersistRepoChunks(chunks);
  } catch (error) {
    console.warn(
      "Repo chunk embedding failed; chat will use fallback retrieval",
      {
        error:
          error instanceof Error ? error.message : "Unknown embedding error",
      },
    );
    return [];
  }
}

export function formatPgVector(vector: number[]) {
  return `[${normalizeEmbedding(vector).join(",")}]`;
}

function createEmbeddingsClient() {
  const config = getEmbeddingConfig();

  if (!config) {
    throw new Error(
      "Repo embeddings are not configured. Set EMBEDDING_API_KEY and EMBEDDING_MODEL.",
    );
  }

  if (usesNvidiaEmbeddingApi(config)) {
    return new NvidiaOpenAICompatibleEmbeddings(config);
  }

  return new OpenAIEmbeddings({
    apiKey: config.apiKey,
    configuration: config.baseURL ? { baseURL: config.baseURL } : undefined,
    dimensions: REPO_CHUNK_EMBEDDING_DIMENSIONS,
    model: config.model,
  });
}

function getEmbeddingConfig() {
  const apiKey =
    process.env.EMBEDDING_API_KEY ??
    process.env.OPENAI_API_KEY ??
    process.env.NVIDIA_API_KEY;
  const model = process.env.EMBEDDING_MODEL;

  if (!(apiKey && model)) return null;

  return {
    apiKey,
    baseURL:
      process.env.EMBEDDING_BASE_URL ??
      process.env.OPENAI_BASE_URL ??
      process.env.NVIDIA_BASE_URL,
    model,
  };
}

class NvidiaOpenAICompatibleEmbeddings extends Embeddings {
  constructor(private readonly config: EmbeddingConfig) {
    super({ maxConcurrency: 2 });
  }

  async embedDocuments(texts: string[]) {
    return this.createEmbeddings({
      input: texts,
      inputType: "passage",
    });
  }

  async embedQuery(text: string) {
    const [embedding] = await this.createEmbeddings({
      input: text,
      inputType: "query",
    });

    if (!embedding) {
      throw new Error("Embedding provider returned no query embedding.");
    }

    return embedding;
  }

  private async createEmbeddings(input: {
    input: string | string[];
    inputType: "passage" | "query";
  }) {
    const baseURL =
      this.config.baseURL ?? "https://integrate.api.nvidia.com/v1";
    const response = await fetch(`${baseURL.replace(/\/$/, "")}/embeddings`, {
      body: JSON.stringify({
        input: input.input,
        input_type: input.inputType,
        model: this.config.model,
      }),
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(
        `Embedding provider request failed with status ${response.status}: ${await response.text()}`,
      );
    }

    const payload = (await response.json()) as {
      data?: { embedding?: number[]; index?: number }[];
    };

    return (payload.data ?? [])
      .sort((first, second) => (first.index ?? 0) - (second.index ?? 0))
      .map((item) => {
        if (!item.embedding) {
          throw new Error(
            "Embedding provider returned an empty embedding item.",
          );
        }

        return item.embedding;
      });
  }
}

function usesNvidiaEmbeddingApi(config: EmbeddingConfig) {
  return (
    config.model.startsWith("nvidia/") ||
    config.baseURL?.includes("integrate.api.nvidia.com")
  );
}

function buildChunkEmbeddingText(chunk: RepoChunkEmbeddingInput) {
  const lineRange =
    chunk.startLine && chunk.endLine
      ? ` lines ${chunk.startLine}-${chunk.endLine}`
      : "";

  return truncateEmbeddingInput(
    `// File: ${chunk.path}${lineRange}\n// Source: ${chunk.source}\n${chunk.content}`,
  );
}

function truncateEmbeddingInput(value: string) {
  if (value.length <= EMBEDDING_INPUT_MAX_CHARS) return value;
  return value.slice(0, EMBEDDING_INPUT_MAX_CHARS);
}

function normalizeEmbedding(vector: number[]) {
  if (vector.length !== REPO_CHUNK_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding dimension mismatch: expected ${REPO_CHUNK_EMBEDDING_DIMENSIONS}, received ${vector.length}.`,
    );
  }

  return vector.map((value) => {
    if (!Number.isFinite(value)) {
      throw new Error("Embedding contained a non-finite value.");
    }

    return value;
  });
}

async function updateRepoChunkEmbedding(input: {
  chunkId: string;
  vector: number[];
}) {
  await prisma.$executeRaw`
    UPDATE "RepoChunk"
    SET "embedding" = ${formatPgVector(input.vector)}::vector
    WHERE "id" = ${input.chunkId}
  `;
}
