"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BrainCircuit,
  Clock3,
  ExternalLink,
  RefreshCw,
  SearchX,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  const isNotFound = state === "not-found";
  const isAnalyzing = viewState === "analyzing";

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

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
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

        <div className="flex flex-1 items-center justify-center">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {isNotFound ? (
                  <SearchX />
                ) : isAnalyzing ? (
                  <Clock3 />
                ) : (
                  <AlertCircle />
                )}
              </div>
              <CardTitle>
                {isNotFound
                  ? "Repository not found"
                  : isAnalyzing
                    ? `${repo.owner}/${repo.name} is still analyzing`
                    : `${repo.owner}/${repo.name} failed analysis`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {isNotFound ? (
                <p className="text-muted-foreground text-sm leading-6">
                  This demo repository id does not exist. Return to the
                  repositories page and open one of the available cards.
                </p>
              ) : isAnalyzing ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{repo.branch}</Badge>
                    <Badge variant="outline">{repo.language}</Badge>
                    <Badge variant="outline">
                      {repo.fileCount.toLocaleString()} files
                    </Badge>
                  </div>
                  <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Analysis progress</span>
                      <span className="text-muted-foreground">
                        {progress}%
                      </span>
                    </div>
                    <Progress value={progress} />
                  </div>
                  <ul className="space-y-2 text-muted-foreground text-sm leading-6">
                    <li>Fetching repository metadata and file tree.</li>
                    <li>Selecting important files for the first report.</li>
                    <li>Preparing architecture and chat context.</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground text-sm leading-6">
                    {errorMsg ??
                      "The analysis stopped before a report was generated."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={retryAnalysis} disabled={isRetrying}>
                      <RefreshCw className={isRetrying ? "animate-spin" : ""} />
                      {isRetrying ? "Retrying" : "Retry analysis"}
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={repo.url} target="_blank" rel="noreferrer">
                        <ExternalLink />
                        View GitHub
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};
