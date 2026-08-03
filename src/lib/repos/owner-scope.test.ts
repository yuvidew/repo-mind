import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildOwnerScopedChatMessageWhere,
  buildOwnerScopedRepoWhere,
} from "./owner-scope";

describe("owner-scoped query helpers", () => {
  test("scopes repository lookups to the authenticated user", () => {
    assert.deepEqual(
      buildOwnerScopedRepoWhere({ repoId: "repo_1", userId: "user_1" }),
      {
        id: "repo_1",
        userId: "user_1",
      },
    );
  });

  test("scopes chat history to both repository and user", () => {
    assert.deepEqual(
      buildOwnerScopedChatMessageWhere({
        repoId: "repo_1",
        userId: "user_1",
      }),
      {
        repoId: "repo_1",
        userId: "user_1",
      },
    );
  });
});
