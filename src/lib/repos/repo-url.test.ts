import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseGitHubRepoUrl } from "./repo-url";

describe("parseGitHubRepoUrl", () => {
  test("normalizes GitHub repository URLs", () => {
    assert.deepEqual(
      parseGitHubRepoUrl(
        " https://www.github.com/vercel/next.js.git?tab=readme#intro ",
      ),
      {
        name: "next.js",
        normalizedUrl: "https://github.com/vercel/next.js",
        owner: "vercel",
      },
    );
  });

  test("accepts nested GitHub paths but normalizes to repository root", () => {
    assert.deepEqual(
      parseGitHubRepoUrl(
        "https://github.com/openai/openai-node/tree/master/src",
      ),
      {
        name: "openai-node",
        normalizedUrl: "https://github.com/openai/openai-node",
        owner: "openai",
      },
    );
  });

  test("rejects non-GitHub and incomplete URLs", () => {
    assert.equal(parseGitHubRepoUrl("https://gitlab.com/openai/repo"), null);
    assert.equal(parseGitHubRepoUrl("https://github.com/openai"), null);
    assert.equal(parseGitHubRepoUrl("git@github.com:openai/repo.git"), null);
  });
});
