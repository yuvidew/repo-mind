import type { AnalysisMode } from "@/lib/analysis-types";
import { inngest } from "./client";

export const REPO_ANALYZE_REQUESTED = "repo/analyze.requested" as const;

export type RepoAnalyzeRequestedData = {
  mode: AnalysisMode;
  repoId: string;
  requestedAt: string;
  userId: string;
};

export function queueRepoAnalysis(input: {
  mode: AnalysisMode;
  repoId: string;
  userId: string;
}) {
  return inngest.send({
    name: REPO_ANALYZE_REQUESTED,
    data: {
      ...input,
      requestedAt: new Date().toISOString(),
    } satisfies RepoAnalyzeRequestedData,
  });
}

export function getRepoAnalysisQueueErrorMessage() {
  if (process.env.NODE_ENV === "development") {
    return "Repository saved, but the background analyzer could not start. Run npm run inngest:dev in another terminal, then retry analysis.";
  }

  return "Repository saved, but the background analyzer could not start. Please retry analysis in a moment.";
}
