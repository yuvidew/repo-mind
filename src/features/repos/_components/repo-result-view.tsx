import { getDemoRepoResult } from "./repo-analysis-demo-data";
import { RepoAnalysisState } from "./repo-analysis-state";
import { RepoChatPanel } from "./repo-chat-panel";
import { RepoReportContent } from "./repo-report-content";
import { RepoResultHeader } from "./repo-result-header";
import { RepoSectionNav } from "./repo-section-nav";

type RepoResultViewProps = {
  id: string;
};

export const RepoResultView = ({ id }: RepoResultViewProps) => {
  const { repo, analysis } = getDemoRepoResult(id);

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
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <RepoResultHeader analysis={analysis} repo={repo} />

        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_340px] lg:items-start">
          <RepoSectionNav analysis={analysis} />
          <RepoReportContent analysis={analysis} />
          <RepoChatPanel repo={repo} />
        </div>
      </div>
    </main>
  );
};
