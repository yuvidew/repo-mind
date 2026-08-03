import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { sanitizeLogMetadata } from "./safe-server-log";

describe("safe server log metadata", () => {
  test("converts errors to safe name and message metadata", () => {
    const error = new Error("provider failed with token sk-live-secret");
    const metadata = sanitizeLogMetadata({ error, repoId: "repo_123" });

    assert.deepEqual(metadata, {
      error: {
        message: "provider failed with token sk-live-secret",
        name: "Error",
      },
      repoId: "repo_123",
    });
    assert.equal("stack" in (metadata.error as Record<string, unknown>), false);
  });

  test("drops undefined values and truncates long strings", () => {
    const metadata = sanitizeLogMetadata({
      empty: undefined,
      message: "x".repeat(600),
    });

    assert.deepEqual(Object.keys(metadata), ["message"]);
    assert.equal((metadata.message as string).length, 503);
    assert.equal((metadata.message as string).endsWith("..."), true);
  });
});
