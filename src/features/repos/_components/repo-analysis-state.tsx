"use client";

import {
  AlertCircle,
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  FileSearch,
  FileText,
  type LucideIcon,
  MessageSquareText,
  Network,
  RefreshCw,
  SearchX,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DemoRepo } from "./repo-demo-data";

type ApiRepoStatus =
  | "PENDING"
  | "FETCHING"
  | "PARSING"
  | "REPORTING"
  | "READY"
  | "FAILED";

type RepoStatusResponse = {
  errorMsg: string | null;
  progress: number;
  status: ApiRepoStatus;
  updatedAt?: string;
};

type RepoAnalysisStateProps =
  | { state: "not-found"; repo?: never }
  | { state: "analyzing" | "failed"; repo: DemoRepo };

type AnalysisStage = "queued" | "fetching" | "parsing" | "reporting" | "ready";

export const RepoAnalysisState = ({ repo, state }: RepoAnalysisStateProps) => {
  const router = useRouter();
  const [progress, setProgress] = useState(repo?.progress ?? 0);
  const [errorMsg, setErrorMsg] = useState(repo?.errorMsg ?? null);
  const [viewState, setViewState] = useState(state);
  const [isRetrying, setIsRetrying] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiRepoStatus>(
    state === "failed" ? "FAILED" : "PENDING",
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [startedAt] = useState(() => Date.now());
  const isNotFound = state === "not-found";
  const isAnalyzing = viewState === "analyzing";
  const currentStage = getCurrentStage(apiStatus, progress);
  const progressMessage = getProgressMessage({ progress, status: apiStatus });
  const lastUpdateMs = updatedAt ? new Date(updatedAt).getTime() : startedAt;
  const elapsedSinceUpdateMs = Number.isFinite(lastUpdateMs)
    ? now - lastUpdateMs
    : now - startedAt;
  const isLikelyStuck =
    isAnalyzing &&
    apiStatus === "PENDING" &&
    progress <= 5 &&
    elapsedSinceUpdateMs > 90_000;

  useEffect(() => {
    if (!repo || viewState !== "analyzing") return;

    const refreshStatus = async () => {
      const response = await fetch(`/api/repos/${repo.id}/status`, {
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = (await response.json()) as RepoStatusResponse;
      setProgress(data.progress);
      setErrorMsg(data.errorMsg);
      setApiStatus(data.status);
      setUpdatedAt(data.updatedAt ?? null);

      if (data.status === "READY") {
        router.refresh();
        return;
      }

      if (data.status === "FAILED") {
        setViewState("failed");
        router.refresh();
      }
    };

    void refreshStatus();
    const intervalId = window.setInterval(refreshStatus, 3000);

    return () => window.clearInterval(intervalId);
  }, [repo, router, viewState]);

  useEffect(() => {
    if (!isAnalyzing) return;

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(intervalId);
  }, [isAnalyzing]);

  const retryAnalysis = async () => {
    if (!repo) return;

    setIsRetrying(true);
    setErrorMsg(null);

    const response = await fetch(`/api/repos/${repo.id}/reanalyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "fast" }),
    });

    if (response.ok) {
      setProgress(5);
      setApiStatus("PENDING");
      setUpdatedAt(null);
      setViewState("analyzing");
      router.refresh();
    } else {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setErrorMsg(data?.error ?? "Unable to restart analysis.");
    }

    setIsRetrying(false);
  };

  if (isNotFound) {
    return <NotFoundState />;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8">
        <AnalysisTopBar />

        {isAnalyzing ? (
          <section className="flex flex-1 items-center py-6">
            <div className="w-full space-y-5">
              <div className="rounded-lg border bg-card p-5 shadow-sm sm:p-6">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
                  <div className="min-w-0 space-y-5">
                    <div className="flex min-w-0 items-start gap-4">
                      <span className="relative flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Clock3 className="size-6 animate-pulse" />
                        <span className="absolute -right-1 -bottom-1 size-3 rounded-full bg-primary" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-primary text-sm">
                          Analyzing repository
                        </p>
                        <h1 className="break-words font-semibold text-3xl tracking-normal sm:text-4xl lg:text-5xl">
                          {repo.owner}/{repo.name}
                        </h1>
                        <p className="mt-3 max-w-2xl text-muted-foreground text-sm leading-6 sm:text-base">
                          RepoMind is preparing the report, file context,
                          architecture map, and chat workspace.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{currentStage.label}</Badge>
                      <Badge variant="outline">{repo.branch}</Badge>
                      <Badge variant="outline">{repo.language}</Badge>
                      <Badge variant="outline">
                        {repo.fileCount.toLocaleString()} files known
                      </Badge>
                    </div>
                  </div>

                  <ProgressDial progress={progress} />
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{currentStage.label}</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress className="h-2" value={progress} />
                  <p className="text-muted-foreground text-sm leading-6">
                    {progressMessage}
                  </p>
                </div>

                <AnalysisStepper currentStage={currentStage.value} />
              </div>

              {isLikelyStuck ? (
                <Alert className="border-amber-500/30 bg-amber-500/10">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Worker has not started yet</AlertTitle>
                  <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      This job is still queued. Retry after confirming the local
                      Inngest worker is connected to the active app port.
                    </span>
                    <Button
                      className="w-fit"
                      disabled={isRetrying}
                      onClick={retryAnalysis}
                      size="sm"
                      type="button"
                    >
                      <RefreshCw className={cn(isRetrying && "animate-spin")} />
                      {isRetrying ? "Retrying" : "Retry analysis"}
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}

              <WorkspacePreview currentStage={currentStage.value} />
            </div>
          </section>
        ) : (
          <FailedState
            errorMsg={errorMsg}
            isRetrying={isRetrying}
            repo={repo}
            retryAnalysis={retryAnalysis}
          />
        )}
      </div>
    </main>
  );
};

function NotFoundState() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <AnalysisTopBar />
        <div className="flex flex-1 items-center justify-center">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <SearchX />
              </div>
              <CardTitle>Repository not found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm leading-6">
                This repository id does not exist. Return to the repositories
                page and open one of the available cards.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function AnalysisTopBar() {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-5">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BrainCircuit className="size-5" />
        </span>
        RepoMind
      </Link>
      <Button variant="outline" asChild>
        <Link href="/repos">
          <ArrowLeft />
          Back to repos
        </Link>
      </Button>
    </div>
  );
}

function ProgressDial({ progress }: { progress: number }) {
  return (
    <div className="flex justify-start lg:justify-end">
      <div
        aria-label={`Analysis ${progress}% complete`}
        className="grid size-40 place-items-center rounded-full"
        role="img"
        style={{
          background: `conic-gradient(var(--primary) ${progress * 3.6}deg, var(--muted) 0deg)`,
        }}
      >
        <div className="grid size-32 place-items-center rounded-full border bg-background">
          <div className="text-center">
            <p className="font-semibold text-4xl tracking-normal">{progress}</p>
            <p className="text-muted-foreground text-xs">percent</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisStepper({ currentStage }: { currentStage: AnalysisStage }) {
  const currentIndex = analysisSteps.findIndex(
    (step) => step.value === currentStage,
  );

  return (
    <div className="mt-6 grid gap-2 md:grid-cols-5">
      {analysisSteps.map((step, index) => {
        const Icon = step.icon;
        const isComplete = index < currentIndex;
        const isActive = index === currentIndex;

        return (
          <div
            className={cn(
              "min-w-0 rounded-lg border bg-background p-3",
              isActive && "border-primary/40 bg-primary/5",
              isComplete && "border-primary/20",
            )}
            key={step.value}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg border bg-muted/30 text-muted-foreground",
                  isActive && "border-primary/30 bg-primary/10 text-primary",
                  isComplete && "text-primary",
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <Icon className={cn("size-4", isActive && "animate-pulse")} />
                )}
              </span>
              <span className="text-muted-foreground text-xs">
                0{index + 1}
              </span>
            </div>
            <p className="truncate font-medium text-sm">{step.label}</p>
          </div>
        );
      })}
    </div>
  );
}

function WorkspacePreview({ currentStage }: { currentStage: AnalysisStage }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Workspace preview</p>
          <p className="text-muted-foreground text-sm">
            Sections appear here as the analysis completes.
          </p>
        </div>
        <Badge variant="outline">Building</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {previewCards.map((card) => {
          const Icon = card.icon;
          const isActive = card.stage === currentStage;

          return (
            <div
              className={cn(
                "min-h-44 rounded-lg border bg-background p-4",
                isActive && "border-primary/40 bg-primary/5",
              )}
              key={card.title}
            >
              <div className="mb-4 flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground",
                    isActive && "bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="font-medium text-sm">{card.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {isActive ? "In progress" : card.status}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FailedState({
  errorMsg,
  isRetrying,
  repo,
  retryAnalysis,
}: {
  errorMsg: string | null;
  isRetrying: boolean;
  repo: DemoRepo;
  retryAnalysis: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle />
          </div>
          <CardTitle>
            {repo.owner}/{repo.name} failed analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTitle>Analysis could not finish</AlertTitle>
            <AlertDescription>
              {errorMsg ??
                "The analysis stopped before a report was generated."}
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Button onClick={retryAnalysis} disabled={isRetrying}>
              <RefreshCw className={cn(isRetrying && "animate-spin")} />
              {isRetrying ? "Retrying" : "Retry analysis"}
            </Button>
            <Button variant="outline" asChild>
              <a href={repo.url} target="_blank" rel="noreferrer">
                <ExternalLink />
                View GitHub
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const analysisSteps = [
  {
    icon: Clock3,
    label: "Queued",
    minProgress: 5,
    value: "queued",
  },
  {
    icon: Database,
    label: "Fetching",
    minProgress: 20,
    value: "fetching",
  },
  {
    icon: FileSearch,
    label: "Reading files",
    minProgress: 45,
    value: "parsing",
  },
  {
    icon: Sparkles,
    label: "Generating",
    minProgress: 70,
    value: "reporting",
  },
  {
    icon: CheckCircle2,
    label: "Ready",
    minProgress: 95,
    value: "ready",
  },
] satisfies Array<{
  icon: LucideIcon;
  label: string;
  minProgress: number;
  value: AnalysisStage;
}>;

const previewCards = [
  {
    icon: FileText,
    stage: "reporting",
    status: "Waiting",
    title: "Report",
  },
  {
    icon: Network,
    stage: "reporting",
    status: "Waiting",
    title: "Diagram",
  },
  {
    icon: FileSearch,
    stage: "parsing",
    status: "Waiting",
    title: "Files",
  },
  {
    icon: MessageSquareText,
    stage: "ready",
    status: "Locked",
    title: "Chat",
  },
] satisfies Array<{
  icon: LucideIcon;
  stage: AnalysisStage;
  status: string;
  title: string;
}>;

function getCurrentStage(status: ApiRepoStatus, progress: number) {
  if (status === "READY" || progress >= 95) return analysisSteps[4];
  if (status === "REPORTING" || progress >= 70) return analysisSteps[3];
  if (status === "PARSING" || progress >= 45) return analysisSteps[2];
  if (status === "FETCHING" || progress >= 20) return analysisSteps[1];
  return analysisSteps[0];
}

function getProgressMessage(input: {
  progress: number;
  status: ApiRepoStatus;
}) {
  const { progress, status } = input;

  if (status === "PENDING" && progress <= 5) {
    return "Waiting for the background analysis worker to accept the job.";
  }

  if (progress >= 90) {
    return "Finalizing the workspace and saving generated context.";
  }

  if (progress >= 70) {
    return "Generating the report, wiki sections, diagram nodes, and citations.";
  }

  if (progress >= 45) {
    return "Reading source files and selecting the most useful context.";
  }

  if (progress >= 20) {
    return "Fetching repository metadata, branch details, and file tree.";
  }

  return "Queued and ready to start.";
}
