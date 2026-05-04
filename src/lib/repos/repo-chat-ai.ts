import "server-only";

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { RepoChatContext } from "./repo-chat-service";

export function createRepoChatStream(input: {
  context: RepoChatContext;
  question: string;
  signal?: AbortSignal;
}) {
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Repo chat is not available right now. Ask the project owner to enable AI chat.",
    );
  }

  const openai = new OpenAI({
    apiKey,
    baseURL:
      process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
  });

  return openai.chat.completions.create(
    {
      model: process.env.CHAT_MODEL ?? "openai/gpt-oss-120b",
      messages: buildMessages(input),
      temperature: 0.4,
      top_p: 0.9,
      max_tokens: 1400,
      stream: true,
    },
    { signal: input.signal },
  );
}

function buildMessages(input: {
  context: RepoChatContext;
  question: string;
}): ChatCompletionMessageParam[] {
  const history = input.context.history
    .filter(
      (message) => message.role === "user" || message.role === "assistant",
    )
    .slice(-8)
    .map((message) => ({
      role: message.role as "assistant" | "user",
      content: message.content,
    }));

  return [
    {
      role: "system",
      content: buildSystemPrompt(input.context, input.question),
    },
    ...history,
    {
      role: "user",
      content: input.question,
    },
  ];
}

function buildSystemPrompt(context: RepoChatContext, question: string) {
  const { report, repo } = context;
  const keyFiles = report?.keyFiles
    .slice(0, 16)
    .map((file) => `- ${file.path}: ${file.purpose}`)
    .join("\n");
  const wikiSections = report?.wikiSections
    .slice(0, 6)
    .map((section) => `## ${section.title}\n${truncate(section.content, 1200)}`)
    .join("\n\n");
  const files = context.files
    .filter((file) => file.summary)
    .slice(0, 30)
    .map((file) => `- ${file.path}: ${file.summary}`)
    .join("\n");
  const prioritizedChunks = prioritizeChunks(context.chunks, question);
  const chunks = prioritizedChunks
    .slice(0, 36)
    .map((chunk, index) => {
      const maxLength = index < 12 ? 1400 : 900;
      return `- ${chunk.path} (${chunk.source}): ${truncate(chunk.content, maxLength)}`;
    })
    .join("\n");

  return `You are RepoMind, an expert repo explainer for ${repo.owner}/${repo.name}.
Answer the user's question using only the repository context below.
Be direct, practical, and beginner-friendly. Name actual files and folders when the context includes them.
For questions about database, auth, jobs, API routes, framework, or libraries, first inspect package/config/schema/db chunks and cite the concrete files that prove the answer.
If the saved analysis does not contain enough information, say that clearly instead of inventing details.
If source coverage is low, mention that limitation before making strong claims.
Do not expose hidden reasoning. Return only the final answer.

Repository metadata:
- Owner/name: ${repo.owner}/${repo.name}
- Branch: ${repo.branch}
- Language: ${repo.language ?? "Unknown"}
- Description: ${repo.description ?? "No description saved"}
- Source coverage: ${report?.repo.sampledFiles ?? context.chunks.length} sampled files in the saved analysis

Summary:
${report?.summary ?? "No saved summary."}

Plain English explanation:
${report?.plainEnglish ?? "No saved plain English explanation."}

Tech stack:
${report?.techStack.join(", ") || "No saved tech stack."}

Architecture:
${report?.architecture ?? "No saved architecture notes."}

Data flow:
${report?.dataFlow ?? "No saved data flow."}

Key files:
${keyFiles || files || "No saved key files."}

Saved chunks:
${chunks || "No saved chunks."}

Beginner guide:
${report?.beginnerGuide.map((step) => `- ${step}`).join("\n") || "No beginner guide saved."}

Risks:
${report?.risks.map((risk) => `- ${risk}`).join("\n") || "No risks saved."}

Wiki sections:
${wikiSections || "No wiki sections saved."}`;
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function prioritizeChunks(chunks: RepoChatContext["chunks"], question: string) {
  return [...chunks].sort((first, second) => {
    return (
      chunkScore(second.path, second.source, second.content, question) -
      chunkScore(first.path, first.source, first.content, question)
    );
  });
}

function chunkScore(
  path: string,
  source: string,
  content: string,
  question: string,
) {
  const lower = path.toLowerCase();
  const lowerContent = content.toLowerCase();
  const questionTokens = extractQuestionTokens(question);
  let score = 0;

  if (source === "sampled-source") score += 40;
  if (lower.endsWith("package.json")) score += 35;
  if (lower.includes("schema.prisma")) score += 35;
  if (lower.includes("prisma.config")) score += 30;
  if (lower.includes("lib/db") || lower.includes("database")) score += 30;
  if (lower.includes("db.")) score += 25;
  if (lower.includes("api/") || lower.endsWith("route.ts")) score += 15;

  for (const token of questionTokens) {
    if (lower.includes(token)) score += 18;
    if (lowerContent.includes(token)) score += 8;
  }

  if (
    asksAboutDatabase(questionTokens) &&
    isDatabasePath(lower, lowerContent)
  ) {
    score += 45;
  }

  if (asksAboutApi(questionTokens) && isApiPath(lower, lowerContent)) {
    score += 35;
  }

  if (asksAboutAuth(questionTokens) && isAuthPath(lower, lowerContent)) {
    score += 35;
  }

  if (asksAboutJobs(questionTokens) && isJobPath(lower, lowerContent)) {
    score += 35;
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

function asksAboutDatabase(tokens: string[]) {
  return tokens.some((token) =>
    [
      "database",
      "db",
      "postgres",
      "prisma",
      "drizzle",
      "mongo",
      "schema",
    ].includes(token),
  );
}

function asksAboutApi(tokens: string[]) {
  return tokens.some((token) =>
    ["api", "route", "endpoint", "server", "trpc", "handler"].includes(token),
  );
}

function asksAboutAuth(tokens: string[]) {
  return tokens.some((token) =>
    ["auth", "login", "signin", "signup", "session", "user"].includes(token),
  );
}

function asksAboutJobs(tokens: string[]) {
  return tokens.some((token) =>
    ["job", "jobs", "queue", "background", "worker", "inngest"].includes(token),
  );
}

function isDatabasePath(path: string, content: string) {
  return (
    path.includes("schema.prisma") ||
    path.includes("prisma.config") ||
    path.includes("drizzle") ||
    path.includes("lib/db") ||
    path.includes("database") ||
    content.includes("prismaclient") ||
    content.includes("postgres") ||
    content.includes("mongoose")
  );
}

function isApiPath(path: string, content: string) {
  return (
    path.includes("api/") ||
    path.endsWith("route.ts") ||
    path.endsWith("route.js") ||
    content.includes("export async function get") ||
    content.includes("export async function post") ||
    content.includes("createtrpc")
  );
}

function isAuthPath(path: string, content: string) {
  return (
    path.includes("auth") ||
    content.includes("better-auth") ||
    content.includes("session")
  );
}

function isJobPath(path: string, content: string) {
  return (
    path.includes("inngest") ||
    path.includes("jobs/") ||
    content.includes("createfunction")
  );
}
