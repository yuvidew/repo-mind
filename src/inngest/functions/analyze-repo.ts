import { inngest } from "@/inngest/client";
import {
  getRepoForUser,
  markRepoFailed,
  markRepoProgress,
  persistRepoAnalysis,
  runRepoAnalysis,
} from "@/lib/repos/repo-service";
import {
  REPO_ANALYZE_REQUESTED,
  type RepoAnalyzeRequestedData,
} from "../queue";

export const analyzeRepo = inngest.createFunction(
  {
    id: "analyze-repo",
    name: "Analyze repository",
    retries: 3,
    triggers: { event: REPO_ANALYZE_REQUESTED },
    concurrency: {
      limit: 1,
      key: "event.data.repoId",
    },
  },
  async ({ event, step }) => {
    const { mode, repoId, userId } = event.data as RepoAnalyzeRequestedData;

    try {
      await step.run("validate repo access", async () => {
        const repo = await getRepoForUser({ id: repoId, userId });

        if (!repo) {
          throw new Error("Repository not found.");
        }

        return { id: repo.id, url: repo.url };
      });

      await step.run("status fetching", () =>
        markRepoProgress({ repoId, progress: 20, status: "FETCHING" }),
      );
      await step.run("status parsing", () =>
        markRepoProgress({ repoId, progress: 45, status: "PARSING" }),
      );
      await step.run("status reporting", () =>
        markRepoProgress({ repoId, progress: 70, status: "REPORTING" }),
      );

      const analysis = await step.run("analyze repository", () =>
        runRepoAnalysis({ mode, repoId, userId }),
      );

      await step.run("persist analysis", () =>
        persistRepoAnalysis({ analysis, repoId }),
      );

      return { repoId, status: "READY" };
    } catch (error) {
      await markRepoFailed({ error, repoId });
      throw error;
    }
  },
);
