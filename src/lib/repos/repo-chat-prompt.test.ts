import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildRepoChatMessages,
  buildRepoChatSystemPrompt,
  type RepoChatPromptContext,
} from "./repo-chat-prompt";

describe("repo chat prompt helpers", () => {
  test("compacts history and saved context before calling the model", () => {
    const context = buildPromptContext();
    const messages = buildRepoChatMessages({
      context,
      question: "Where should I start?",
    });
    const systemPrompt = String(messages[0]?.content ?? "");

    assert.equal(messages.length, 6);
    assert.equal(messages.at(-1)?.role, "user");
    assert.equal(messages.at(-1)?.content, "Where should I start?");
    assert.ok(systemPrompt.includes("src/file-0.ts"));
    assert.ok(systemPrompt.includes("src/file-5.ts"));
    assert.equal(systemPrompt.includes("src/file-6.ts"), false);
    assert.ok(systemPrompt.length < 12_000);
    assert.equal(
      messages.some(
        (message) =>
          message.role === "assistant" &&
          String(message.content).includes("old assistant answer"),
      ),
      false,
    );
  });

  test("uses file summaries when key files are not available", () => {
    const prompt = buildRepoChatSystemPrompt({
      ...buildPromptContext(),
      report: null,
    });

    assert.ok(prompt.includes("src/summary.ts"));
    assert.ok(prompt.includes("Useful summary"));
  });
});

function buildPromptContext(): RepoChatPromptContext {
  return {
    chunks: Array.from({ length: 12 }, (_, index) => ({
      content: `chunk ${index} ${"x".repeat(2_000)}`,
      endLine: index + 10,
      path: `src/file-${index}.ts`,
      similarity: null,
      source: "sampled-source",
      startLine: index + 1,
    })),
    files: [
      {
        path: "src/summary.ts",
        summary: "Useful summary",
      },
    ],
    history: [
      {
        content: "old assistant answer",
        role: "assistant",
      },
      {
        content: "recent user question",
        role: "user",
      },
      {
        content: "recent assistant answer ".repeat(200),
        role: "assistant",
      },
      {
        content: "new user question",
        role: "user",
      },
      {
        content: "new assistant answer",
        role: "assistant",
      },
    ],
    report: {
      architecture: "Architecture details ".repeat(200),
      beginnerGuide: ["Read README.md", "Read package.json"],
      dataFlow: "Data flow details ".repeat(200),
      debug: {
        detectedStack: ["TypeScript"],
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
          purpose: "Project overview",
        },
      ],
      plainEnglish: "Plain explanation ".repeat(200),
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
      risks: ["Risk details"],
      summary: "Summary details ".repeat(200),
      techStack: ["TypeScript", "Next.js"],
      warnings: [],
      wikiSections: Array.from({ length: 5 }, (_, index) => ({
        content: `wiki ${index} ${"x".repeat(2_000)}`,
        title: `Wiki ${index}`,
      })),
    },
    repo: {
      branch: "main",
      description: "Test repo",
      language: "TypeScript",
      name: "repo",
      owner: "owner",
    },
  };
}
