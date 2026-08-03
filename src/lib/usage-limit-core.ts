import { PublicAppError } from "@/lib/public-errors";

export const USAGE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type UsageLimitAction = "REPO_ANALYSIS" | "CHAT_MESSAGE";

export type UsageLimitInput = {
  repoId?: string;
  type: UsageLimitAction;
  userId: string;
};

export type UsageLimitConfig = {
  dailyChatMessages: number;
  dailyRepoAnalyses: number;
};

export class UsageLimitError extends PublicAppError {
  limit: number;
  remaining: number;
  resetAt: Date;

  constructor(input: {
    code: string;
    limit: number;
    message: string;
    remaining: number;
    resetAt: Date;
  }) {
    super({
      code: input.code,
      message: input.message,
      status: 429,
    });
    this.name = "UsageLimitError";
    this.limit = input.limit;
    this.remaining = input.remaining;
    this.resetAt = input.resetAt;
  }
}

export function getUsageLimitForAction(
  type: UsageLimitAction,
  limits: UsageLimitConfig,
) {
  if (type === "CHAT_MESSAGE") {
    return limits.dailyChatMessages;
  }

  return limits.dailyRepoAnalyses;
}

export function getUsageWindowStart(now = new Date()) {
  return new Date(now.getTime() - USAGE_WINDOW_MS);
}

export function getUsageWindowResetAt(now = new Date()) {
  return new Date(now.getTime() + USAGE_WINDOW_MS);
}

export function getUsageResetAtFromOldest(
  oldestEventCreatedAt: Date | null | undefined,
  now = new Date(),
) {
  return new Date(
    (oldestEventCreatedAt?.getTime() ?? now.getTime()) + USAGE_WINDOW_MS,
  );
}

export function buildUsageLimitError(
  type: UsageLimitAction,
  input: { limit: number; resetAt: Date },
) {
  if (type === "CHAT_MESSAGE") {
    return new UsageLimitError({
      code: "daily-chat-limit-reached",
      limit: input.limit,
      message: `Daily repo chat limit reached. Try again after ${input.resetAt.toUTCString()}.`,
      remaining: 0,
      resetAt: input.resetAt,
    });
  }

  return new UsageLimitError({
    code: "daily-analysis-limit-reached",
    limit: input.limit,
    message: `Daily repository analysis limit reached. Try again after ${input.resetAt.toUTCString()}.`,
    remaining: 0,
    resetAt: input.resetAt,
  });
}
