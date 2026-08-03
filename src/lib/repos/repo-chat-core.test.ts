import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildRepoChatMessageData,
  buildRepoChatResponseMetadata,
} from "./repo-chat-core";

describe("repo chat core helpers", () => {
  test("builds chat message create data", () => {
    assert.deepEqual(
      buildRepoChatMessageData({
        content: "Explain the repo.",
        metadataJson: { model: "test-model" },
        repoId: "repo_1",
        role: "assistant",
        userId: "user_1",
      }),
      {
        content: "Explain the repo.",
        metadataJson: { model: "test-model" },
        repoId: "repo_1",
        role: "assistant",
        userId: "user_1",
      },
    );
  });

  test("builds assistant response metadata from retrieved chunks", () => {
    assert.deepEqual(
      buildRepoChatResponseMetadata({
        chunks: [
          {
            endLine: 12,
            id: "chunk_1",
            path: "src/app.ts",
            similarity: 0.91,
            source: "sampled-source",
            startLine: 4,
          },
        ],
        model: "openai/gpt-oss-20b",
      }),
      {
        citations: [
          {
            chunkId: "chunk_1",
            endLine: 12,
            path: "src/app.ts",
            similarity: 0.91,
            source: "sampled-source",
            startLine: 4,
          },
        ],
        model: "openai/gpt-oss-20b",
      },
    );
  });
});
