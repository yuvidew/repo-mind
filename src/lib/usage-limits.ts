import "server-only";

import type { UsageEventType } from "@/generated/prisma/client";
import prisma from "@/lib/db";
import { PublicAppError } from "@/lib/public-errors";
import { serverConfig } from "@/lib/server-config";

const USAGE_WINDOW_MS = 24 * 60 * 60 * 1000;

type UsageLimitAction = UsageEventType;

type UsageLimitInput = {
  repoId?: string;
  type: UsageLimitAction;
  userId: string;
};

type UsageEventClient = Pick<typeof prisma, "usageEvent">;

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

export async function assertUsageAvailable(input: UsageLimitInput) {
  const limit = getUsageLimit(input.type);
  const windowStart = getUsageWindowStart();
  const used = await prisma.usageEvent.count({
    where: {
      createdAt: { gte: windowStart },
      type: input.type,
      userId: input.userId,
    },
  });

  if (used < limit) {
    return {
      limit,
      remaining: limit - used,
      resetAt: getUsageWindowResetAt(),
    };
  }

  throw buildUsageLimitError(input.type, {
    limit,
    resetAt: await getUsageResetAt(prisma, input, windowStart),
  });
}

export async function recordUsageEvent(input: UsageLimitInput) {
  await prisma.usageEvent.create({
    data: {
      repoId: input.repoId,
      type: input.type,
      userId: input.userId,
    },
    select: { id: true },
  });
}

export async function consumeUsage(input: UsageLimitInput) {
  const limit = getUsageLimit(input.type);
  const windowStart = getUsageWindowStart();

  return prisma.$transaction(async (transaction) => {
    const used = await transaction.usageEvent.count({
      where: {
        createdAt: { gte: windowStart },
        type: input.type,
        userId: input.userId,
      },
    });

    if (used >= limit) {
      throw buildUsageLimitError(input.type, {
        limit,
        resetAt: await getUsageResetAt(transaction, input, windowStart),
      });
    }

    await transaction.usageEvent.create({
      data: {
        repoId: input.repoId,
        type: input.type,
        userId: input.userId,
      },
      select: { id: true },
    });

    return {
      limit,
      remaining: limit - used - 1,
      resetAt: getUsageWindowResetAt(),
    };
  });
}

function getUsageLimit(type: UsageLimitAction) {
  if (type === "CHAT_MESSAGE") {
    return serverConfig.usageLimits.dailyChatMessages;
  }

  return serverConfig.usageLimits.dailyRepoAnalyses;
}

function getUsageWindowStart() {
  return new Date(Date.now() - USAGE_WINDOW_MS);
}

function getUsageWindowResetAt() {
  return new Date(Date.now() + USAGE_WINDOW_MS);
}

async function getUsageResetAt(
  client: UsageEventClient,
  input: UsageLimitInput,
  windowStart: Date,
) {
  const oldestEvent = await client.usageEvent.findFirst({
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
    where: {
      createdAt: { gte: windowStart },
      type: input.type,
      userId: input.userId,
    },
  });

  return new Date(
    (oldestEvent?.createdAt.getTime() ?? Date.now()) + USAGE_WINDOW_MS,
  );
}

function buildUsageLimitError(
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
