type RepoChatMessageDataInput<TMetadata> = {
  content: string;
  metadataJson?: TMetadata;
  repoId: string;
  role: "assistant" | "user";
  userId: string;
};

type RepoChatCitationChunk = {
  endLine: number | null;
  id: string;
  path: string;
  similarity: number | null;
  source: string;
  startLine: number | null;
};

export function buildRepoChatMessageData<TMetadata>(
  input: RepoChatMessageDataInput<TMetadata>,
) {
  return {
    content: input.content,
    metadataJson: input.metadataJson,
    repoId: input.repoId,
    role: input.role,
    userId: input.userId,
  };
}

export function buildRepoChatResponseMetadata(input: {
  chunks: RepoChatCitationChunk[];
  fallbackReason?: string;
  model: string;
}) {
  return {
    citations: input.chunks.map((chunk) => ({
      chunkId: chunk.id,
      endLine: chunk.endLine,
      path: chunk.path,
      similarity: chunk.similarity,
      source: chunk.source,
      startLine: chunk.startLine,
    })),
    fallbackReason: input.fallbackReason,
    isFallback: Boolean(input.fallbackReason),
    model: input.model,
  };
}
