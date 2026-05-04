import { ArrowLeft, BrainCircuit, ExternalLink } from "lucide-react";
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
import { RepoReanalyzeButton } from "./repo-reanalyze-button";

type RepoResultHeaderProps = {
  repo: DemoRepo;
  analysis: RepositoryAnalysis;
};

export const RepoResultHeader = ({ analysis, repo }: RepoResultHeaderProps) => {
  const title = `${repo.owner}/${repo.name}`;

  return (
    <header className="space-y-5 border-b pb-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="flex w-fit items-center gap-2 font-semibold">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BrainCircuit className="size-5" />
          </span>
          <span>RepoMind</span>
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/repos">
              <ArrowLeft />
              Back to repos
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href={repo.url} target="_blank" rel="noreferrer">
              <ExternalLink />
              View GitHub
            </a>
          </Button>
          <RepoReanalyzeButton repoId={repo.id} />
        </div>
      </div>

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

      <div className="space-y-4">
        <div className="space-y-2">
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
          <Badge variant="outline">{analysis.repo.language ?? "Unknown"}</Badge>
          <Badge variant="outline">
            {analysis.repo.fileCount.toLocaleString()} files
          </Badge>
          <Badge variant="outline">{analysis.repo.sampledFiles} sampled</Badge>
          <Badge className="capitalize" variant="outline">
            {analysis.repo.analysisMode} mode
          </Badge>
        </div>
      </div>
    </header>
  );
};
