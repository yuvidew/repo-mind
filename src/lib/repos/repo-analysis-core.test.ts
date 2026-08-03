import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { PublicAppError } from "@/lib/public-errors";
import {
  buildSourceChunks,
  getFreshnessStatus,
  getRepoFailureMessage,
  slugify,
} from "./repo-analysis-core";

describe("repo analysis core helpers", () => {
  test("keeps public and known failure messages while sanitizing unknown errors", () => {
    assert.equal(
      getRepoFailureMessage(
        new PublicAppError({
          code: "invalid-github-url",
          message: "Enter a valid GitHub repository URL.",
        }),
      ),
      "Enter a valid GitHub repository URL.",
    );

    const githubError = new Error("GitHub repository lookup failed.");
    githubError.name = "GitHubRequestError";
    assert.equal(
      getRepoFailureMessage(githubError),
      "GitHub repository lookup failed.",
    );

    assert.equal(
      getRepoFailureMessage(new Error("provider secret: sk-live-secret")),
      "Analysis failed before RepoMind could finish. Retry in a moment; if it keeps happening, check GitHub access and model configuration.",
    );
  });

  test("calculates freshness from analyzed and latest commit shas", () => {
    assert.equal(
      getFreshnessStatus({
        analyzedCommitSha: "abc",
        latestCommitSha: "abc",
      }),
      "fresh",
    );
    assert.equal(
      getFreshnessStatus({
        analyzedCommitSha: "abc",
        latestCommitSha: "def",
      }),
      "stale",
    );
    assert.equal(
      getFreshnessStatus({
        analyzedCommitSha: null,
        latestCommitSha: "def",
      }),
      "unknown",
    );
  });

  test("slugifies report section titles for saved report files", () => {
    assert.equal(
      slugify("Data Model & Persistence!"),
      "data-model-persistence",
    );
  });

  test("builds source chunks with line ranges and overlap", () => {
    const content = Array.from(
      { length: 90 },
      (_, index) => `line ${index + 1}`,
    ).join("\n");
    const chunks = buildSourceChunks({
      content,
      fileId: "file_1",
      path: "src/app.ts",
      repoId: "repo_1",
      source: "sampled-source",
    });

    assert.equal(chunks.length, 2);
    assert.deepEqual(
      {
        endLine: chunks[0]?.endLine,
        startLine: chunks[0]?.startLine,
      },
      {
        endLine: 80,
        startLine: 1,
      },
    );
    assert.deepEqual(
      {
        endLine: chunks[1]?.endLine,
        startLine: chunks[1]?.startLine,
      },
      {
        endLine: 90,
        startLine: 69,
      },
    );
  });
});
