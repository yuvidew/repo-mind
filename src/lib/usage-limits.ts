import "server-only";

import prisma from "@/lib/db";
import { serverConfig } from "@/lib/server-config";
import {
  buildUsageLimitError,
  getUsageLimitForAction,
  getUsageResetAtFromOldest,
  getUsageWindowResetAt,
  getUsageWindowStart,
  type UsageLimitAction,
  type UsageLimitInput,
} from "@/lib/usage-limit-core";

type UsageEventClient = Pick<typeof prisma, "usageEvent">;

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
  return getUsageLimitForAction(type, serverConfig.usageLimits);
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

  return getUsageResetAtFromOldest(oldestEvent?.createdAt);
}
