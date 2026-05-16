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
      content: buildSystemPrompt(input.context),
    },
    ...history,
    {
      role: "user",
      content: input.question,
    },
  ];
}

function buildSystemPrompt(context: RepoChatContext) {
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
  const chunks = context.chunks
    .slice(0, 36)
    .map((chunk, index) => {
      const maxLength = index < 12 ? 1400 : 900;
      const lineRange =
        chunk.startLine && chunk.endLine
          ? ` lines ${chunk.startLine}-${chunk.endLine}`
          : "";
      const score =
        typeof chunk.similarity === "number"
          ? ` similarity ${chunk.similarity.toFixed(3)}`
          : " fallback";

      return `- ${chunk.path}${lineRange} (${chunk.source},${score}): ${truncate(chunk.content, maxLength)}`;
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
