import "server-only";

const DEFAULT_NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_REPORT_MODEL = "deepseek-ai/deepseek-v4-pro";
const DEFAULT_CHAT_MODEL = "openai/gpt-oss-20b";

export const serverConfig = {
  ai: {
    chatModel: readEnv("CHAT_MODEL") ?? DEFAULT_CHAT_MODEL,
    embeddingApiKey:
      readEnv("EMBEDDING_API_KEY") ??
      readEnv("OPENAI_API_KEY") ??
      readEnv("NVIDIA_API_KEY"),
    embeddingBaseUrl:
      readEnv("EMBEDDING_BASE_URL") ??
      readEnv("OPENAI_BASE_URL") ??
      readEnv("NVIDIA_BASE_URL"),
    embeddingModel: readEnv("EMBEDDING_MODEL"),
    nvidiaApiKey: readEnv("NVIDIA_API_KEY"),
    nvidiaBaseUrl: readEnv("NVIDIA_BASE_URL") ?? DEFAULT_NVIDIA_BASE_URL,
    reportModel: readEnv("DEEPSEEK_MODEL") ?? DEFAULT_REPORT_MODEL,
  },
  auth: {
    betterAuthUrl: readEnv("BETTER_AUTH_URL"),
    githubClientId: readEnv("GITHUB_CLIENT_ID"),
    githubClientSecret: readEnv("GITHUB_CLIENT_SECRET"),
  },
  database: {
    url: readEnv("DATABASE_URL"),
  },
  email: {
    resendApiKey: readEnv("RESEND_API_KEY"),
    resendFromEmail: readEnv("RESEND_FROM_EMAIL"),
  },
  github: {
    token: readEnv("GITHUB_TOKEN"),
  },
  inngest: {
    eventKey: readEnv("INNGEST_EVENT_KEY"),
  },
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  nodeEnv: process.env.NODE_ENV ?? "development",
  usageLimits: {
    dailyChatMessages: readPositiveIntegerEnv("REPOMIND_DAILY_CHAT_LIMIT", 80),
    dailyRepoAnalyses: readPositiveIntegerEnv(
      "REPOMIND_DAILY_ANALYSIS_LIMIT",
      10,
    ),
  },
} as const;

export type ServerConfigIssue = {
  key: string;
  message: string;
  severity: "error" | "warning";
};

export function getServerConfigIssues(): ServerConfigIssue[] {
  const issues: ServerConfigIssue[] = [];

  if (!serverConfig.database.url) {
    issues.push({
      key: "DATABASE_URL",
      message: "Database access is required for RepoMind persistence.",
      severity: "error",
    });
  }

  if (
    serverConfig.isProduction &&
    (!serverConfig.auth.githubClientId || !serverConfig.auth.githubClientSecret)
  ) {
    issues.push({
      key: "GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET",
      message:
        "GitHub OAuth credentials are required for production GitHub sign-in and private repository access.",
      severity: "error",
    });
  }

  if (!serverConfig.ai.nvidiaApiKey) {
    issues.push({
      key: "NVIDIA_API_KEY",
      message:
        "AI report generation and repo chat will fall back or be unavailable without NVIDIA_API_KEY.",
      severity: "warning",
    });
  }

  if (!serverConfig.ai.embeddingModel || !serverConfig.ai.embeddingApiKey) {
    issues.push({
      key: "EMBEDDING_MODEL/EMBEDDING_API_KEY",
      message:
        "Repo chat will use keyword fallback retrieval until embeddings are configured.",
      severity: "warning",
    });
  }

  if (serverConfig.isProduction && !serverConfig.inngest.eventKey) {
    issues.push({
      key: "INNGEST_EVENT_KEY",
      message:
        "Production background job delivery should use INNGEST_EVENT_KEY.",
      severity: "warning",
    });
  }

  return issues;
}

function readEnv(name: string) {
  return process.env[name]?.trim() || undefined;
}

function readPositiveIntegerEnv(name: string, fallback: number) {
  const value = readEnv(name);
  if (!value) return fallback;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) return fallback;

  return parsed;
}
