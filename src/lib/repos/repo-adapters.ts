import type { DemoRepo } from "@/features/repos/_components/repo-demo-data";
import type { Repo } from "@/generated/prisma/client";
import type { RepositoryAnalysis } from "@/lib/analysis-types";

export type RepoResultData = {
  analysis: RepositoryAnalysis | null;
  repo: DemoRepo | null;
};

export function toRepoCard(repo: Repo): DemoRepo {
  return {
    id: repo.id,
    owner: repo.owner,
    name: repo.name,
    description: repo.description ?? "Repository analysis is being prepared.",
    url: repo.url,
    status: toUiStatus(repo.status),
    visibility: repo.visibility === "Private" ? "Private" : "Public",
    branch: repo.branch,
    language: repo.language ?? "Unknown",
    fileCount: repo.fileCount,
    lastAnalyzedAt: formatRepoDate(repo),
    progress: repo.progress,
    errorMsg: repo.errorMsg,
  };
}

export function toRepoResult(repo: Repo): RepoResultData {
  return {
    repo: toRepoCard(repo),
    analysis: parseReport(repo.reportJson),
  };
}

function toUiStatus(status: Repo["status"]): DemoRepo["status"] {
  if (status === "READY") return "READY";
  if (status === "FAILED") return "FAILED";
  return "ANALYZING";
}

function parseReport(value: unknown): RepositoryAnalysis | null {
  if (!value || typeof value !== "object") return null;
  return value as RepositoryAnalysis;
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
