import type { RepositoryAnalysis } from "@/lib/analysis-types";

export type RepoChatFallbackReason = "model-timeout";

type RepoChatFallbackChunk = {
  content: string;
  endLine: number | null;
  path: string;
  similarity: number | null;
  source: string;
  startLine: number | null;
};

type RepoChatFallbackFile = {
  path: string;
  summary: string | null;
};

type RepoChatFallbackRepo = {
  branch: string;
  description: string | null;
  language: string | null;
  name: string;
  owner: string;
};

export type RepoChatFallbackContext = {
  chunks: RepoChatFallbackChunk[];
  files: RepoChatFallbackFile[];
  report: RepositoryAnalysis | null;
  repo: RepoChatFallbackRepo;
};

type FallbackFileItem = {
  note: string;
  path: string;
};

export function buildRepoChatFallbackAnswer(input: {
  context: RepoChatFallbackContext;
  question: string;
  reason: RepoChatFallbackReason;
}) {
  const { context } = input;
  const summary =
    context.report?.summary ||
    context.report?.plainEnglish ||
    context.repo.description ||
    "RepoMind has saved repository context, but no high-level summary was generated.";
  const files = collectFallbackFiles(context);
  const chunks = selectFallbackChunks({
    chunks: context.chunks,
    question: input.question,
  });
  const lines = [
    "I could not get a model response in time, so here is a saved-context answer from RepoMind.",
    "",
    `For ${context.repo.owner}/${context.repo.name}, ${truncateText(
      summary,
      420,
    )}`,
  ];

  if (files.length) {
    lines.push("", "Start here:");
    lines.push(
      ...files.map(
        (file, index) =>
          `${index + 1}. \`${file.path}\` - ${truncateText(file.note, 220)}`,
      ),
    );
  }

  if (chunks.length) {
    lines.push("", "Relevant saved context:");
    lines.push(
      ...chunks.map((chunk) => {
        const lineLabel = formatLineRange(chunk);
        return `- \`${chunk.path}${lineLabel}\`: ${truncateText(
          normalizeSnippet(chunk.content),
          220,
        )}`;
      }),
    );
  }

  lines.push(
    "",
    "This fallback only uses saved analysis and retrieved repository context. Retry chat for a fuller AI-generated answer.",
  );

  return lines.join("\n");
}

function collectFallbackFiles(context: RepoChatFallbackContext) {
  const seen = new Set<string>();
  const files: FallbackFileItem[] = [];

  function add(path: string, note: string | null | undefined) {
    if (!(path && note) || seen.has(path)) return;

    seen.add(path);
    files.push({ note, path });
  }

  for (const keyFile of context.report?.keyFiles ?? []) {
    add(keyFile.path, keyFile.purpose);
    if (files.length >= 6) return files;
  }

  for (const file of context.files) {
    add(file.path, file.summary);
    if (files.length >= 6) return files;
  }

  for (const chunk of context.chunks) {
    add(chunk.path, normalizeSnippet(chunk.content));
    if (files.length >= 6) return files;
  }

  return files;
}

function selectFallbackChunks(input: {
  chunks: RepoChatFallbackChunk[];
  question: string;
}) {
  const tokens = extractQuestionTokens(input.question);

  return [...input.chunks]
    .sort((first, second) => {
      return chunkScore(second, tokens) - chunkScore(first, tokens);
    })
    .slice(0, 4);
}

function chunkScore(chunk: RepoChatFallbackChunk, tokens: string[]) {
  const haystack = `${chunk.path}\n${chunk.content}`.toLowerCase();
  let score = typeof chunk.similarity === "number" ? chunk.similarity * 20 : 0;

  if (chunk.source.includes("source")) score += 8;
  if (chunk.path.endsWith("package.json")) score += 5;

  for (const token of tokens) {
    if (haystack.includes(token)) score += 10;
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

function formatLineRange(chunk: RepoChatFallbackChunk) {
  if (!chunk.startLine) return "";

  if (chunk.endLine && chunk.endLine !== chunk.startLine) {
    return ` L${chunk.startLine}-${chunk.endLine}`;
  }

  return ` L${chunk.startLine}`;
}

function normalizeSnippet(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}...`;
}
