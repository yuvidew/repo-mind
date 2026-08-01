import type { RepoResultData } from "@/lib/repos/repo-adapters";
import { RepoAnalysisState } from "./repo-analysis-state";
import { RepoReportContent } from "./repo-report-content";
import { RepoResultHeader } from "./repo-result-header";

type RepoResultViewProps = {
  result: RepoResultData | null;
};

export const RepoResultView = ({ result }: RepoResultViewProps) => {
  const repo = result?.repo ?? null;
  const analysis = result?.analysis ?? null;

  if (!repo) {
    return <RepoAnalysisState state="not-found" />;
  }

  if (repo.status === "ANALYZING") {
    return <RepoAnalysisState repo={repo} state="analyzing" />;
  }

  if (repo.status === "FAILED" || !analysis) {
    return <RepoAnalysisState repo={repo} state="failed" />;
  }

  return (
    <main className="min-h-screen bg-muted/20 text-foreground">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <RepoResultHeader analysis={analysis} repo={repo} />

        <RepoReportContent analysis={analysis} repo={repo} repoId={repo.id} />
      </div>
    </main>
  );
};
