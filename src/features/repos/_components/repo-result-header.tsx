import {
  ArrowLeft,
  BookOpenText,
  BrainCircuit,
  ExternalLink,
  FileCode2,
  GitCommitHorizontal,
  MessageSquareText,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import type { RepositoryAnalysis } from "@/lib/analysis-types";
import type { DemoRepo } from "./repo-demo-data";
import { RepoFreshnessButton } from "./repo-freshness-button";
import { RepoReanalyzeButton } from "./repo-reanalyze-button";

type RepoResultHeaderProps = {
  repo: DemoRepo;
  analysis: RepositoryAnalysis;
};

export const RepoResultHeader = ({ analysis, repo }: RepoResultHeaderProps) => {
  const title = `${repo.owner}/${repo.name}`;
  const generatedAt = formatGeneratedAt(analysis.provenance.generatedAt);
  const commitLabel =
    analysis.provenance.analyzedCommitSha?.slice(0, 7) ?? "not captured";
  const workspaceStats = [
    {
      description: "Source files found",
      icon: FileCode2,
      label: "Files",
      value: analysis.repo.fileCount.toLocaleString(),
    },
    {
      description: "Used for the report",
      icon: BookOpenText,
      label: "Sampled",
      value: analysis.repo.sampledFiles.toLocaleString(),
    },
    {
      description: "Cited repo context",
      icon: MessageSquareText,
      label: "Chat",
      value: repo.status === "READY" ? "Ready" : "Locked",
    },
  ];

  return (
    <header className="overflow-hidden rounded-lg border bg-background shadow-sm">
      <div className="flex flex-col gap-4 border-b bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          <Link
            href="/"
            className="flex w-fit items-center gap-2 font-semibold"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BrainCircuit className="size-5" />
            </span>
            <span>RepoMind</span>
          </Link>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/repos">Repositories</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/repos">
              <ArrowLeft />
              Back to repos
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={repo.url} target="_blank" rel="noreferrer">
              <ExternalLink />
              View GitHub
            </a>
          </Button>
          <RepoFreshnessButton repoId={repo.id} />
          <RepoReanalyzeButton repoId={repo.id} />
        </div>
      </div>

      <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:p-5">
        <div className="min-w-0 space-y-4">
          <div className="space-y-2">
            <p className="font-medium text-primary text-sm">
              Repository intelligence
            </p>
            <h1 className="font-semibold text-3xl tracking-normal sm:text-4xl">
              {title}
            </h1>
            <p className="max-w-4xl text-muted-foreground text-sm leading-6 sm:text-base">
              {analysis.summary}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              variant="outline"
            >
              Ready
            </Badge>
            <Badge variant="outline">{analysis.repo.defaultBranch}</Badge>
            <Badge variant="outline">
              {analysis.repo.language ?? "Unknown"}
            </Badge>
            <Badge className="capitalize" variant="outline">
              {analysis.repo.analysisMode} mode
            </Badge>
            <Badge className="capitalize" variant="outline">
              {analysis.provenance.freshnessStatus}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground text-xs leading-5">
            <span>Generated {generatedAt}</span>
            <span>
              {analysis.provenance.provider}
              {analysis.provenance.model
                ? ` / ${analysis.provenance.model}`
                : ""}
            </span>
            {analysis.provenance.analyzedCommitSha ? (
              <a
                href={`${repo.url}/tree/${analysis.provenance.analyzedCommitSha}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
              >
                <GitCommitHorizontal className="size-3.5" />
                {commitLabel}
              </a>
            ) : (
              <span>Commit {commitLabel}</span>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {workspaceStats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                className="rounded-lg border bg-muted/20 p-3"
                key={stat.label}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs uppercase tracking-normal">
                      {stat.label}
                    </p>
                    <p className="mt-1 truncate font-semibold text-lg">
                      {stat.value}
                    </p>
                  </div>
                  <Icon className="size-4 shrink-0 text-primary" />
                </div>
                <p className="mt-2 text-muted-foreground text-xs">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
};

function formatGeneratedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "recently";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
