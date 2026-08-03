import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildUsageLimitError,
  getUsageLimitForAction,
  getUsageResetAtFromOldest,
  getUsageWindowResetAt,
  getUsageWindowStart,
  USAGE_WINDOW_MS,
} from "./usage-limit-core";

describe("usage limit core", () => {
  test("selects limits by action type", () => {
    const limits = {
      dailyChatMessages: 80,
      dailyRepoAnalyses: 10,
    };

    assert.equal(getUsageLimitForAction("CHAT_MESSAGE", limits), 80);
    assert.equal(getUsageLimitForAction("REPO_ANALYSIS", limits), 10);
  });

  test("calculates rolling window boundaries", () => {
    const now = new Date("2026-08-03T12:00:00.000Z");

    assert.equal(
      getUsageWindowStart(now).toISOString(),
      new Date(now.getTime() - USAGE_WINDOW_MS).toISOString(),
    );
    assert.equal(
      getUsageWindowResetAt(now).toISOString(),
      new Date(now.getTime() + USAGE_WINDOW_MS).toISOString(),
    );
  });

  test("uses oldest counted event for reset time", () => {
    const now = new Date("2026-08-03T12:00:00.000Z");
    const oldest = new Date("2026-08-03T04:30:00.000Z");

    assert.equal(
      getUsageResetAtFromOldest(oldest, now).toISOString(),
      "2026-08-04T04:30:00.000Z",
    );
    assert.equal(
      getUsageResetAtFromOldest(null, now).toISOString(),
      "2026-08-04T12:00:00.000Z",
    );
  });

  test("builds chat and analysis limit errors", () => {
    const resetAt = new Date("2026-08-04T04:30:00.000Z");

    const chatError = buildUsageLimitError("CHAT_MESSAGE", {
      limit: 80,
      resetAt,
    });
    assert.equal(chatError.status, 429);
    assert.equal(chatError.code, "daily-chat-limit-reached");
    assert.equal(chatError.limit, 80);
    assert.equal(chatError.remaining, 0);
    assert.match(chatError.message, /Daily repo chat limit reached/);

    const analysisError = buildUsageLimitError("REPO_ANALYSIS", {
      limit: 10,
      resetAt,
    });
    assert.equal(analysisError.code, "daily-analysis-limit-reached");
    assert.match(analysisError.message, /Daily repository analysis limit/);
  });
});
