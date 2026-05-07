import type { DemoRepo } from "@/features/repos/_components/repo-demo-data";
import type { Repo } from "@/generated/prisma/client";
import type { RepositoryAnalysis } from "@/lib/analysis-types";

export type RepoResultData = {
  analysis: RepositoryAnalysis | null;
  repo: DemoRepo | null;
};

export function toRepoCard(repo: Repo): DemoRepo {
  const analysis = parseReport(repo.reportJson);
  const isMissingReadyReport = repo.status === "READY" && !analysis;

  return {
    id: repo.id,
    owner: repo.owner,
    name: repo.name,
    description: getRepoCardDescription({
      analysis,
      isMissingReadyReport,
      repo,
    }),
    url: repo.url,
    status: toUiStatus(repo.status, analysis),
    visibility: repo.visibility === "Private" ? "Private" : "Public",
    branch: repo.branch,
    language: repo.language ?? "Unknown",
    fileCount: repo.fileCount,
    lastAnalyzedAt: formatRepoDate(repo),
    analyzedCommitSha: repo.analyzedCommitSha,
    latestCommitSha: repo.latestCommitSha,
    freshnessStatus: toFreshnessStatus(repo.freshnessStatus),
    progress: repo.progress,
    errorMsg: isMissingReadyReport
      ? "This saved repository is missing its generated report. Reanalyze to rebuild it."
      : repo.errorMsg,
  };
}

export function toRepoResult(repo: Repo): RepoResultData {
  return {
    repo: toRepoCard(repo),
    analysis: parseReport(repo.reportJson),
  };
}

function toUiStatus(
  status: Repo["status"],
  analysis: RepositoryAnalysis | null,
): DemoRepo["status"] {
  if (status === "READY" && !analysis) return "FAILED";
  if (status === "READY") return "READY";
  if (status === "FAILED") return "FAILED";
  return "ANALYZING";
}

function getRepoCardDescription(input: {
  analysis: RepositoryAnalysis | null;
  isMissingReadyReport: boolean;
  repo: Repo;
}) {
  if (input.isMissingReadyReport) {
    return "The saved report is missing. Open this repository and retry analysis to rebuild the workspace.";
  }

  const candidates = [
    input.repo.description,
    input.analysis?.repo.description,
    input.analysis?.summary,
    input.analysis?.plainEnglish,
  ];

  return (
    candidates.find((candidate) => isUsefulDescription(candidate)) ??
    "Open this repository to view its generated report and saved analysis context."
  );
}

function isUsefulDescription(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length >= 12;
}

function parseReport(value: unknown): RepositoryAnalysis | null {
  if (!value || typeof value !== "object") return null;
  return value as RepositoryAnalysis;
}

function toFreshnessStatus(
  value: string,
): DemoRepo["freshnessStatus"] | undefined {
  if (value === "fresh" || value === "stale") return value;
  return undefined;
}

function formatRepoDate(repo: Repo) {
  if (repo.status !== "READY" && repo.status !== "FAILED") {
    return "In progress";
  }

  const date = repo.lastAnalyzedAt ?? repo.updatedAt;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
