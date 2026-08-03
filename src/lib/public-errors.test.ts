import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { PublicAppError, toApiErrorResponse } from "./public-errors";
import { UsageLimitError } from "./usage-limit-core";

describe("public API errors", () => {
  test("serializes public errors with status and code", async () => {
    const response = toApiErrorResponse(
      new PublicAppError({
        code: "github-token-scope-missing",
        message: "Reconnect GitHub.",
        status: 403,
      }),
      { fallbackMessage: "Fallback" },
    );

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      code: "github-token-scope-missing",
      error: "Reconnect GitHub.",
    });
  });

  test("serializes usage limit metadata", async () => {
    const resetAt = new Date("2026-08-03T12:00:00.000Z");
    const response = toApiErrorResponse(
      new UsageLimitError({
        code: "daily-chat-limit-reached",
        limit: 2,
        message: "Daily repo chat limit reached.",
        remaining: 0,
        resetAt,
      }),
      { fallbackMessage: "Fallback" },
    );

    assert.equal(response.status, 429);
    assert.deepEqual(await response.json(), {
      code: "daily-chat-limit-reached",
      error: "Daily repo chat limit reached.",
      limit: 2,
      remaining: 0,
      resetAt: resetAt.toISOString(),
    });
  });

  test("hides unexpected error messages", async () => {
    const response = toApiErrorResponse(new Error("secret provider key"), {
      fallbackMessage: "Unable to send this message.",
      fallbackStatus: 503,
    });

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: "Unable to send this message.",
    });
  });
});
