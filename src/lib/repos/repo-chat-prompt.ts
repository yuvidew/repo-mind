import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { RepositoryAnalysis } from "@/lib/analysis-types";

export const REPO_CHAT_PROMPT_LIMITS = {
  architectureChars: 700,
  beginnerSteps: 6,
  chunkLimit: 6,
  dataFlowChars: 700,
  fileSummaries: 10,
  historyAssistantChars: 900,
  historyMessages: 4,
  historyUserChars: 700,
  keyFiles: 10,
  plainEnglishChars: 700,
  primaryChunkChars: 700,
  risks: 6,
  secondaryChunkChars: 450,
  summaryChars: 700,
  wikiSectionChars: 550,
  wikiSections: 2,
} as const;

type RepoChatPromptChunk = {
  content: string;
  endLine: number | null;
  path: string;
  similarity: number | null;
  source: string;
  startLine: number | null;
};

type RepoChatPromptFile = {
  path: string;
  summary: string | null;
};

type RepoChatPromptHistoryMessage = {
  content: string;
  role: string;
};

type RepoChatPromptRepo = {
  branch: string;
  description: string | null;
  language: string | null;
  name: string;
  owner: string;
};

export type RepoChatPromptContext = {
  chunks: RepoChatPromptChunk[];
  files: RepoChatPromptFile[];
  history: RepoChatPromptHistoryMessage[];
  report: RepositoryAnalysis | null;
  repo: RepoChatPromptRepo;
};

export function buildRepoChatMessages(input: {
  context: RepoChatPromptContext;
  question: string;
}): ChatCompletionMessageParam[] {
  return [
    {
      role: "system",
      content: buildRepoChatSystemPrompt(input.context),
    },
    ...buildPromptHistory(input.context.history),
    {
      role: "user",
      content: input.question,
    },
  ];
}

export function buildRepoChatSystemPrompt(context: RepoChatPromptContext) {
  const { report, repo } = context;
  const keyFiles = report?.keyFiles
    .slice(0, REPO_CHAT_PROMPT_LIMITS.keyFiles)
    .map((file) => `- ${file.path}: ${truncateText(file.purpose, 220)}`)
    .join("\n");
  const wikiSections = report?.wikiSections
    .slice(0, REPO_CHAT_PROMPT_LIMITS.wikiSections)
    .map(
      (section) =>
        `## ${section.title}\n${truncateText(
          section.content,
          REPO_CHAT_PROMPT_LIMITS.wikiSectionChars,
        )}`,
    )
    .join("\n\n");
  const files = context.files
    .filter((file) => file.summary)
    .slice(0, REPO_CHAT_PROMPT_LIMITS.fileSummaries)
    .map((file) => `- ${file.path}: ${truncateText(file.summary ?? "", 220)}`)
    .join("\n");
  const chunks = context.chunks
    .slice(0, REPO_CHAT_PROMPT_LIMITS.chunkLimit)
    .map((chunk, index) => {
      const maxLength =
        index < 4
          ? REPO_CHAT_PROMPT_LIMITS.primaryChunkChars
          : REPO_CHAT_PROMPT_LIMITS.secondaryChunkChars;
      const lineRange =
        chunk.startLine && chunk.endLine
          ? ` lines ${chunk.startLine}-${chunk.endLine}`
          : "";
      const score =
        typeof chunk.similarity === "number"
          ? ` similarity ${chunk.similarity.toFixed(3)}`
          : " fallback";

      return `- ${chunk.path}${lineRange} (${chunk.source},${score}): ${truncateText(
        chunk.content,
        maxLength,
      )}`;
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
${truncateText(report?.summary ?? "No saved summary.", REPO_CHAT_PROMPT_LIMITS.summaryChars)}

Plain English explanation:
${truncateText(report?.plainEnglish ?? "No saved plain English explanation.", REPO_CHAT_PROMPT_LIMITS.plainEnglishChars)}

Tech stack:
${report?.techStack.join(", ") || "No saved tech stack."}

Architecture:
${truncateText(report?.architecture ?? "No saved architecture notes.", REPO_CHAT_PROMPT_LIMITS.architectureChars)}

Data flow:
${truncateText(report?.dataFlow ?? "No saved data flow.", REPO_CHAT_PROMPT_LIMITS.dataFlowChars)}

Key files:
${keyFiles || files || "No saved key files."}

Relevant saved chunks:
${chunks || "No saved chunks."}

Beginner guide:
${
  report?.beginnerGuide
    .slice(0, REPO_CHAT_PROMPT_LIMITS.beginnerSteps)
    .map((step) => `- ${truncateText(step, 220)}`)
    .join("\n") || "No beginner guide saved."
}

Risks:
${
  report?.risks
    .slice(0, REPO_CHAT_PROMPT_LIMITS.risks)
    .map((risk) => `- ${truncateText(risk, 220)}`)
    .join("\n") || "No risks saved."
}

Wiki sections:
${wikiSections || "No wiki sections saved."}`;
}

function buildPromptHistory(
  history: RepoChatPromptHistoryMessage[],
): ChatCompletionMessageParam[] {
  return history
    .slice(-REPO_CHAT_PROMPT_LIMITS.historyMessages)
    .flatMap((message) => {
      if (message.role !== "assistant" && message.role !== "user") return [];

      const maxLength =
        message.role === "assistant"
          ? REPO_CHAT_PROMPT_LIMITS.historyAssistantChars
          : REPO_CHAT_PROMPT_LIMITS.historyUserChars;

      return [
        {
          role: message.role,
          content: truncateText(message.content, maxLength),
        },
      ];
    });
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}...`;
}
