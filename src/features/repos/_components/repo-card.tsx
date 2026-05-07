import {
  AlertCircle,
  Clock3,
  Code2,
  ExternalLink,
  FileCode2,
  GitBranch,
  GitCommitHorizontal,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { DemoRepo, RepoStatus } from "./repo-demo-data";

type RepoCardProps = {
  repo: DemoRepo;
};

const statusConfig: Record<
  RepoStatus,
  { label: string; className: string; icon: typeof ShieldCheck }
> = {
  READY: {
    label: "Ready",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: ShieldCheck,
  },
  ANALYZING: {
    label: "Analyzing",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    icon: Clock3,
  },
  FAILED: {
    label: "Failed",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
    icon: AlertCircle,
  },
};

export const RepoCard = ({ repo }: RepoCardProps) => {
  const status = statusConfig[repo.status];
  const StatusIcon = status.icon;
  const isFailed = repo.status === "FAILED";
  const isAnalyzing = repo.status === "ANALYZING";

  return (
    <Card className="min-h-77.5 justify-between">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <CardTitle className="truncate text-lg">
              {repo.owner}/{repo.name}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={cn("gap-1", status.className)}
              >
                <StatusIcon />
                {status.label}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                {repo.visibility === "Private" ? (
                  <LockKeyhole />
                ) : (
                  <ExternalLink />
                )}
                {repo.visibility}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="line-clamp-3 text-muted-foreground text-sm leading-6">
          {repo.description}
        </p>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <MetaItem icon={GitBranch} label="Branch" value={repo.branch} />
          <MetaItem icon={Code2} label="Language" value={repo.language} />
          <MetaItem
            icon={FileCode2}
            label="Files"
            value={repo.fileCount.toLocaleString()}
          />
          <MetaItem icon={Clock3} label="Updated" value={repo.lastAnalyzedAt} />
          {repo.analyzedCommitSha ? (
            <MetaItem
              icon={GitCommitHorizontal}
              label="Commit"
              value={repo.analyzedCommitSha.slice(0, 7)}
            />
          ) : null}
          {repo.freshnessStatus ? (
            <MetaItem
              icon={ShieldCheck}
              label="Freshness"
              value={capitalize(repo.freshnessStatus)}
            />
          ) : null}
        </div>
        {isAnalyzing ? (
          <div className="space-y-2 rounded-lg border bg-muted/25 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Analysis progress</span>
              <span className="text-muted-foreground">{repo.progress}%</span>
            </div>
            <Progress value={repo.progress ?? 0} />
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="gap-2">
        <Button size="sm" asChild disabled={isAnalyzing}>
          <Link href={`/repos/${repo.id}`}>Open report</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={repo.url} target="_blank" rel="noreferrer">
            <ExternalLink />
            GitHub
          </a>
        </Button>
        {isFailed ? (
          <Button size="sm" variant="destructive" className="ml-auto" asChild>
            <Link href={`/repos/${repo.id}`}>
              <RefreshCw />
              Retry
            </Link>
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
};

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof GitBranch;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-background p-3">
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground text-xs">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="truncate font-medium text-sm">{value}</div>
    </div>
  );
}
