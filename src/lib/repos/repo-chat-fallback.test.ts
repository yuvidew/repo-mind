import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildRepoChatFallbackAnswer,
  type RepoChatFallbackContext,
} from "./repo-chat-fallback";

describe("repo chat fallback helpers", () => {
  test("builds a useful saved-context answer when the model times out", () => {
    const context: RepoChatFallbackContext = {
      chunks: [
        {
          content:
            "The app starts from src/app/layout.tsx and wraps route groups.",
          endLine: 12,
          path: "src/app/layout.tsx",
          similarity: 0.8,
          source: "sampled-source",
          startLine: 1,
        },
      ],
      files: [
        {
          path: "package.json",
          summary: "Shows scripts and framework dependencies.",
        },
      ],
      report: {
        architecture: "Architecture",
        beginnerGuide: [],
        dataFlow: "Data flow",
        debug: {
          detectedStack: ["Next.js"],
          model: "test-model",
          provider: "test",
          selectedFiles: [],
          source: "ai",
          treeTruncated: false,
        },
        diagram: { edges: [], nodes: [] },
        keyFiles: [
          {
            path: "README.md",
            purpose: "Explains the project goal and setup.",
          },
        ],
        plainEnglish: "Plain English",
        provenance: {
          analyzedCommitSha: "abc",
          freshnessStatus: "fresh",
          generatedAt: "2026-08-03T00:00:00.000Z",
          latestCommitSha: "abc",
          model: "test-model",
          promptVersion: "test",
          provider: "test",
        },
        repo: {
          analysisMode: "fast",
          defaultBranch: "main",
          description: "Test repo",
          fileCount: 10,
          language: "TypeScript",
          name: "repo",
          owner: "owner",
          sampledFiles: 8,
          stars: 0,
          url: "https://github.com/owner/repo",
        },
        risks: [],
        summary: "This is a Next.js app.",
        techStack: ["Next.js"],
        warnings: [],
        wikiSections: [],
      },
      repo: {
        branch: "main",
        description: "Test repo",
        language: "TypeScript",
        name: "repo",
        owner: "owner",
      },
    };
    const answer = buildRepoChatFallbackAnswer({
      context,
      question: "What should I read first?",
      reason: "model-timeout",
    });

    assert.ok(answer.includes("saved-context answer"));
    assert.ok(answer.includes("owner/repo"));
    assert.ok(answer.includes("`README.md`"));
    assert.ok(answer.includes("`src/app/layout.tsx L1-12`"));
    assert.ok(answer.includes("Retry chat"));
  });
});
