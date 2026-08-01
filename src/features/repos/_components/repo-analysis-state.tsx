"use client";

import {
  AlertCircle,
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  FileCode2,
  FileSearch,
  FileText,
  GitFork,
  type LucideIcon,
  MessageSquareText,
  RefreshCw,
  Route,
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

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <AnalysisTopBar />

        {isAnalyzing ? (
          <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="min-w-0 space-y-6">
              <div className="rounded-lg border bg-card p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Clock3 className="size-6 animate-pulse" />
                        <span className="absolute -right-1 -bottom-1 size-3 rounded-full bg-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-primary text-sm">
                          Live repository analysis
                        </p>
                        <h1 className="break-words font-semibold text-3xl tracking-normal sm:text-4xl">
                          {repo.owner}/{repo.name}
                        </h1>
                      </div>
                    </div>
                    <p className="max-w-3xl text-muted-foreground text-sm leading-6 sm:text-base">
                      RepoMind is building a guided workspace while files,
                      report sections, diagram nodes, and chat context are
                      prepared in the background.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{currentStage.label}</Badge>
                      <Badge variant="outline">{repo.branch}</Badge>
                      <Badge variant="outline">{repo.language}</Badge>
                      <Badge variant="outline">
                        {repo.fileCount.toLocaleString()} files known
                      </Badge>
                    </div>
                  </div>

                  <div className="w-full shrink-0 rounded-lg border bg-background p-4 xl:w-80">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium">Analysis progress</span>
                      <span className="text-muted-foreground">{progress}%</span>
                    </div>
                    <Progress className="h-2" value={progress} />
                    <p className="mt-3 text-muted-foreground text-sm leading-6">
                      {progressMessage}
                    </p>
                  </div>
                </div>
              </div>

              {isLikelyStuck ? (
                <Alert className="border-amber-500/30 bg-amber-500/10">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Worker has not started yet</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <span className="block">
                      This analysis is still queued at 5%. In local development,
                      make sure the Inngest dev server is synced to the same
                      port as the Next.js app, then retry the analysis.
                    </span>
                    <Button
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

              <AnalysisWorkspaceSkeleton progress={progress} />
            </section>

            <aside className="space-y-4">
              <AnalysisStepTimeline
                currentStage={currentStage.value}
                progress={progress}
              />
              <Card className="bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GitFork className="size-4 text-primary" />
                    What is happening now
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-muted-foreground text-sm leading-6">
                  <p>
                    Metadata and the GitHub tree are checked first, then a small
                    set of high-signal files is selected for the first report.
                  </p>
                  <p>
                    If the model is slow, RepoMind keeps the workspace usable by
                    saving fallback report content from the sampled code.
                  </p>
                </CardContent>
              </Card>
            </aside>
          </div>
        ) : (
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
        )}
      </div>
    </main>
  );
};

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

function AnalysisStepTimeline({
  currentStage,
  progress,
}: {
  currentStage: AnalysisStage;
  progress: number;
}) {
  return (
    <Card className="bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Route className="size-4 text-primary" />
          Analysis pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {analysisSteps.map((step, index) => {
          const Icon = step.icon;
          const isComplete = step.minProgress < progress;
          const isActive = step.value === currentStage;

          return (
            <div
              className={cn(
                "grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-lg border bg-background p-3",
                isActive && "border-primary/40 bg-primary/5",
              )}
              key={step.value}
            >
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg border bg-muted/30 text-muted-foreground",
                  isActive && "border-primary/30 bg-primary/10 text-primary",
                  isComplete && "border-primary/20 text-primary",
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <Icon className={cn("size-4", isActive && "animate-pulse")} />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-sm">{step.label}</p>
                  <span className="text-muted-foreground text-xs">
                    0{index + 1}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground text-xs leading-5">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function AnalysisWorkspaceSkeleton({ progress }: { progress: number }) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        {["Overview", "Diagram", "Wiki", "Files", "Chat"].map((item) => (
          <div
            className="rounded-md border bg-background px-3 py-1.5 text-muted-foreground text-xs"
            key={item}
          >
            {item}
          </div>
        ))}
        <Badge className="ml-auto" variant="outline">
          Building
        </Badge>
      </div>

      <div className="grid min-h-[520px] lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 border-b p-4 lg:border-r lg:border-b-0">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div className="min-h-72 rounded-lg border bg-muted/20 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Route className="size-4 text-primary" />
                  Architecture map
                </div>
                <Badge variant="outline">{progress}%</Badge>
              </div>
              <div className="relative h-52 overflow-hidden rounded-lg border bg-background/70 p-4">
                <div className="absolute top-8 left-8 size-16 rounded-lg border bg-primary/10" />
                <div className="absolute top-20 left-1/2 size-20 -translate-x-1/2 rounded-lg border bg-muted" />
                <div className="absolute right-8 bottom-8 size-16 rounded-lg border bg-primary/10" />
                <div className="absolute top-16 left-24 h-px w-32 rotate-12 bg-border" />
                <div className="absolute right-24 bottom-20 h-px w-32 -rotate-12 bg-border" />
              </div>
            </div>

            <div className="grid gap-3">
              {[
                ["Files", "Detecting source paths"],
                ["Chunks", "Preparing retrieval"],
                ["Citations", "Linking line ranges"],
              ].map(([label, detail]) => (
                <div
                  className="rounded-lg border bg-background p-3"
                  key={label}
                >
                  <p className="text-muted-foreground text-xs">{label}</p>
                  <p className="mt-1 font-medium text-sm">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {[72, 88, 58].map((width, index) => (
              <div className="rounded-lg border bg-background p-3" key={width}>
                <Skeleton className="mb-3 h-2 w-24" />
                <Skeleton className="h-3" style={{ width: `${width}%` }} />
                {index === 1 ? <Skeleton className="mt-2 h-3 w-2/3" /> : null}
              </div>
            ))}
          </div>
        </div>

        <aside className="flex min-h-96 flex-col bg-muted/15 p-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquareText className="size-5" />
            </div>
            <div>
              <p className="font-medium">Repo chat</p>
              <p className="text-muted-foreground text-xs">
                Unlocks when context is ready
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-14 w-5/6" />
          </div>
          <div className="mt-auto flex h-10 items-center gap-2 rounded-lg border bg-background px-3 text-muted-foreground text-xs">
            <FileCode2 className="size-4" />
            Questions become available after analysis
          </div>
        </aside>
      </div>
    </div>
  );
}

type AnalysisStage = "queued" | "fetching" | "parsing" | "reporting" | "ready";

const analysisSteps = [
  {
    description: "The background worker accepts the repo analysis event.",
    icon: Clock3,
    label: "Queued",
    minProgress: 5,
    value: "queued",
  },
  {
    description: "GitHub metadata, branch, and tree data are loaded.",
    icon: Database,
    label: "Fetching repository",
    minProgress: 20,
    value: "fetching",
  },
  {
    description: "Important files are selected and source context is sampled.",
    icon: FileSearch,
    label: "Selecting files",
    minProgress: 45,
    value: "parsing",
  },
  {
    description: "The report, wiki sections, diagram, and citations are built.",
    icon: Sparkles,
    label: "Generating workspace",
    minProgress: 70,
    value: "reporting",
  },
  {
    description: "Files, chunks, and chat-ready context are saved.",
    icon: CheckCircle2,
    label: "Saving results",
    minProgress: 95,
    value: "ready",
  },
] satisfies Array<{
  description: string;
  icon: LucideIcon;
  label: string;
  minProgress: number;
  value: AnalysisStage;
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
    return "Finalizing the report and preparing fallback output if the model is slow.";
  }

  if (progress >= 84) {
    return "Reading sampled source files and building the chat context.";
  }

  if (progress >= 78) {
    return "Scanning the repository tree and selecting important files.";
  }

  if (progress >= 70) {
    return "Generating the report, wiki sections, diagram nodes, and chat context.";
  }

  if (progress >= 45) {
    return "Parsing the file tree and deciding which files matter most.";
  }

  if (progress >= 20) {
    return "Fetching repository metadata from GitHub.";
  }

  return "Waiting for the background analysis job to start.";
}
