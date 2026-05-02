"use client";

import {
  AlertCircle,
  BookOpenText,
  ExternalLink,
  FileCode2,
  Loader2,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AnalysisMode, RepositoryAnalysis } from "@/lib/analysis-types";

const EXAMPLE_REPO = "https://github.com/vercel/next.js";

export function RepoAnalyzer() {
  const [url, setUrl] = useState(EXAMPLE_REPO);
  const [analysis, setAnalysis] = useState<RepositoryAnalysis | null>(null);
  const [mode, setMode] = useState<AnalysisMode>("fast");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, url }),
      });
      const payload = (await response.json()) as
        | RepositoryAnalysis
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Analysis failed.",
        );
      }

      setAnalysis(payload as RepositoryAnalysis);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Analysis failed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b bg-muted/35">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <Badge variant="outline" className="gap-1.5 rounded-md">
                <Sparkles className="size-3" /> RepoMind MVP
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-normal text-balance sm:text-4xl">
                  GitHub repo analyzer
                </h1>
                <p className="max-w-2xl text-muted-foreground text-sm leading-6 sm:text-base">
                  Paste a public GitHub repository URL, scan representative
                  code, and generate a step-by-step explanation with a simple
                  code flow chart.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">GitHub tree scan</Badge>
              <Badge variant="secondary">DeepSeek report</Badge>
              <Badge variant="secondary">Flow chart</Badge>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-3 rounded-lg border bg-background p-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto_auto]"
          >
            <Input
              aria-label="GitHub repository URL"
              className="h-10 flex-1"
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
            <div className="grid grid-cols-2 rounded-lg border bg-muted/30 p-1">
              <ModeButton
                isActive={mode === "fast"}
                label="Fast"
                onClick={() => setMode("fast")}
              />
              <ModeButton
                isActive={mode === "deep"}
                label="Deep"
                onClick={() => setMode("deep")}
              />
            </div>
            <Button
              type="submit"
              className="h-10 min-w-36"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
              {isLoading ? "Analyzing" : "Analyze"}
            </Button>
          </form>

          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:px-8">
        {analysis ? (
          <WikiReport analysis={analysis} />
        ) : (
          <EmptyState isLoading={isLoading} />
        )}
      </section>
    </main>
  );
}

function EmptyState({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="grid gap-4 lg:col-span-2 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>
            {isLoading ? "Reading repository" : "Ready for a test repo"}
          </CardTitle>
          <CardDescription>
            {isLoading
              ? "Fetching cached GitHub data, sampling the most useful files, and generating a short report with a fallback if the model is slow."
              : "The first result will appear here with a code walkthrough, file order, risks, and a flow chart."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {["Fetch tree", "Sample key files", "Quick report"].map(
              (step, index) => (
                <div key={step} className="rounded-lg border bg-muted/30 p-4">
                  <div className="mb-3 flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {isLoading && index === 1 ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <p className="font-medium text-sm">{step}</p>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>MVP analyzer notes</CardTitle>
          <CardDescription>
            For now this scans public repositories through the GitHub API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground text-sm leading-6">
          <p>
            Fast mode uses a smaller sample and a short model timeout so the
            page returns quickly with a step-by-step fallback. Deep mode scans
            more context when accuracy matters more than speed.
          </p>
          <p>Large repos are sampled to keep analysis fast and inexpensive.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function WikiReport({ analysis }: { analysis: RepositoryAnalysis }) {
  const pageLinks = [
    { id: "overview", title: "Overview" },
    { id: "diagram", title: "Code Flow Diagram" },
    ...analysis.wikiSections.map((section) => ({
      id: slugify(section.title),
      title: section.title,
    })),
    { id: "key-files", title: "Key Files" },
    { id: "debug", title: "Analyzer Debug" },
  ];

  return (
    <div className="grid gap-6 lg:col-span-2 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-5 space-y-5 border-r pr-5">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <BookOpenText className="size-5 text-primary" />
            Repo Wiki
          </div>
          <nav className="space-y-2">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              On this page
            </p>
            <div className="space-y-1 border-l pl-3">
              {pageLinks.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  className="block text-muted-foreground text-sm leading-5 transition-colors hover:text-foreground"
                >
                  {link.title}
                </a>
              ))}
            </div>
          </nav>

          <div className="space-y-2 border-t pt-4 text-muted-foreground text-xs leading-5">
            <p>
              Generated from {analysis.repo.sampledFiles} selected files out of{" "}
              {analysis.repo.fileCount} repository files.
            </p>
            <Badge
              variant={
                analysis.debug.source === "ai" ? "secondary" : "destructive"
              }
              className="capitalize"
            >
              {analysis.debug.source === "ai" ? "AI result" : "Fallback"}
            </Badge>
          </div>
        </div>
      </aside>

      <article className="min-w-0 space-y-8">
        <header id="overview" className="space-y-4 scroll-mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{analysis.repo.defaultBranch}</Badge>
            <Badge variant="outline">{analysis.repo.fileCount} files</Badge>
            <Badge variant="outline">
              {analysis.repo.sampledFiles} sampled
            </Badge>
            <Badge variant="outline" className="capitalize">
              {analysis.repo.analysisMode} mode
            </Badge>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-normal text-balance">
              {analysis.repo.owner}/{analysis.repo.name}
            </h2>
            <p className="max-w-3xl text-muted-foreground text-base leading-7">
              {analysis.plainEnglish}
            </p>
            <a
              href={analysis.repo.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-primary text-sm hover:underline"
            >
              Open repository <ExternalLink className="size-3.5" />
            </a>
          </div>
        </header>

        <section id="diagram" className="space-y-3 scroll-mt-6">
          <div className="space-y-1">
            <h3 className="font-semibold text-2xl tracking-normal">
              Code Flow Diagram
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              A simplified map of the important code layers and how work moves
              through the repository.
            </p>
          </div>
          <FlowChart analysis={analysis} />
        </section>

        {analysis.wikiSections.map((section) => (
          <WikiSectionView key={section.title} section={section} />
        ))}

        <section id="key-files" className="space-y-4 scroll-mt-6">
          <div className="space-y-1">
            <h3 className="font-semibold text-2xl tracking-normal">
              Key Files
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              Start with these files to understand how the codebase fits
              together.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {analysis.keyFiles.map((file) => (
              <div key={file.path} className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <FileCode2 className="size-4 text-primary" />
                  <span className="break-all">{file.path}</span>
                </div>
                <p className="mt-1 text-muted-foreground text-sm leading-6">
                  {file.purpose}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <ListCard title="Tech stack" items={analysis.techStack} />
          <ListCard title="Risks and gaps" items={analysis.risks} />
        </div>

        {analysis.warnings.length > 0 ? (
          <ListCard title="Warnings" items={analysis.warnings} tone="warning" />
        ) : null}

        <section id="debug" className="scroll-mt-6">
          <AnalyzerDebug analysis={analysis} />
        </section>
      </article>
    </div>
  );
}

function WikiSectionView({
  section,
}: {
  section: RepositoryAnalysis["wikiSections"][number];
}) {
  return (
    <section id={slugify(section.title)} className="space-y-3 scroll-mt-6">
      <h3 className="font-semibold text-2xl tracking-normal">
        {section.title}
      </h3>
      <WikiContent content={section.content} />
    </section>
  );
}

function WikiContent({ content }: { content: string }) {
  const steps = splitStepText(content);

  if (steps.length > 1) {
    return (
      <ol className="list-decimal space-y-3 pl-5 text-muted-foreground text-base leading-8">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    );
  }

  return (
    <p className="max-w-4xl text-muted-foreground text-base leading-8">
      {content}
    </p>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function AnalyzerDebug({ analysis }: { analysis: RepositoryAnalysis }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyzer debug</CardTitle>
        <CardDescription>
          Use this to check whether the AI saw the right repo context.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          <DebugRow label="Source" value={analysis.debug.source} />
          <DebugRow label="Provider" value={analysis.debug.provider} />
          <DebugRow label="Model" value={analysis.debug.model ?? "none"} />
          <DebugRow
            label="Tree truncated"
            value={analysis.debug.treeTruncated ? "yes" : "no"}
          />
        </div>

        {analysis.debug.detectedStack.length > 0 ? (
          <div className="space-y-2">
            <p className="font-medium text-sm">Detected stack</p>
            <div className="flex flex-wrap gap-1.5">
              {analysis.debug.detectedStack.map((item) => (
                <Badge key={item} variant="secondary" className="rounded-md">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="font-medium text-sm">Files sent to AI</p>
          <div className="max-h-56 space-y-1 overflow-auto rounded-lg border bg-muted/20 p-2">
            {analysis.debug.selectedFiles.map((file) => (
              <p
                key={file}
                className="break-all font-mono text-muted-foreground text-xs leading-5"
              >
                {file}
              </p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all text-right font-medium">{value}</span>
    </div>
  );
}

function ModeButton({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      className={
        isActive
          ? "inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-background px-3 font-medium text-sm shadow-sm"
          : "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-muted-foreground text-sm transition-colors hover:text-foreground"
      }
      onClick={onClick}
    >
      {label === "Fast" ? <Zap className="size-3.5" /> : null}
      {label}
    </button>
  );
}

function splitStepText(value: string) {
  return value
    .split(/(?=Step \d+:)/g)
    .map((step) => step.trim().replace(/^Step \d+:\s*/, ""))
    .filter(Boolean);
}

function ListCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone?: "warning";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm leading-6">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-muted-foreground">
              <span
                className={
                  tone === "warning"
                    ? "mt-2 size-1.5 shrink-0 rounded-full bg-amber-500"
                    : "mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                }
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function FlowChart({ analysis }: { analysis: RepositoryAnalysis }) {
  const { nodes, edges } = analysis.diagram;
  const layout = useMemo(() => buildDiagramLayout(nodes), [nodes]);
  const nodeById = useMemo(() => {
    return new Map(layout.map((node) => [node.id, node]));
  }, [layout]);
  const visibleEdges = edges
    .map((edge) => ({
      ...edge,
      fromNode: nodeById.get(edge.from),
      toNode: nodeById.get(edge.to),
    }))
    .filter(
      (
        edge,
      ): edge is typeof edge & {
        fromNode: DiagramNodeLayout;
        toNode: DiagramNodeLayout;
      } => Boolean(edge.fromNode && edge.toNode),
    );

  if (nodes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20">
        <div className="relative min-h-115 w-full min-w-0 p-4">
          <svg
            aria-hidden="true"
            className="absolute inset-0 size-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <marker
                id="diagram-arrow"
                markerHeight="6"
                markerWidth="6"
                orient="auto"
                refX="5"
                refY="3"
              >
                <path d="M0,0 L6,3 L0,6 Z" className="fill-muted-foreground" />
              </marker>
            </defs>
            {visibleEdges.map((edge) => {
              const path = buildConnectorPath(edge.fromNode, edge.toNode);

              return (
                <path
                  key={`${edge.from}-${edge.to}-${edge.label ?? "edge"}`}
                  d={path}
                  className="fill-none stroke-muted-foreground/60"
                  markerEnd="url(#diagram-arrow)"
                  strokeWidth="0.28"
                />
              );
            })}
          </svg>

          {layout.map((node, index) => (
            <div
              key={node.id}
              data-diagram-node="true"
              className="absolute flex min-h-20 w-36 -translate-x-1/2 -translate-y-1/2 flex-col justify-center rounded-lg border bg-background p-2.5 text-center shadow-sm"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <div className="mb-1 flex items-center justify-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-md bg-primary/10 font-medium text-primary text-xs">
                  {index + 1}
                </span>
                <p className="font-medium text-sm leading-4">{node.label}</p>
              </div>
              {node.detail ? (
                <p className="line-clamp-2 wrap-break-word text-muted-foreground text-xs leading-5">
                  {node.detail}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type DiagramNodeLayout = RepositoryAnalysis["diagram"]["nodes"][number] & {
  x: number;
  y: number;
};

function buildDiagramLayout(
  nodes: RepositoryAnalysis["diagram"]["nodes"],
): DiagramNodeLayout[] {
  const layouts: Array<Array<{ x: number; y: number }>> = [
    [{ x: 50, y: 50 }],
    [
      { x: 28, y: 50 },
      { x: 72, y: 50 },
    ],
    [
      { x: 22, y: 50 },
      { x: 50, y: 28 },
      { x: 78, y: 50 },
    ],
    [
      { x: 22, y: 32 },
      { x: 50, y: 24 },
      { x: 78, y: 32 },
      { x: 50, y: 76 },
    ],
    [
      { x: 22, y: 28 },
      { x: 50, y: 20 },
      { x: 78, y: 28 },
      { x: 66, y: 76 },
      { x: 34, y: 76 },
    ],
    [
      { x: 22, y: 24 },
      { x: 50, y: 18 },
      { x: 78, y: 24 },
      { x: 78, y: 70 },
      { x: 50, y: 82 },
      { x: 22, y: 70 },
    ],
    [
      { x: 11, y: 54 },
      { x: 28, y: 42 },
      { x: 45, y: 54 },
      { x: 62, y: 30 },
      { x: 82, y: 30 },
      { x: 82, y: 72 },
      { x: 62, y: 72 },
    ],
    [
      { x: 22, y: 22 },
      { x: 50, y: 16 },
      { x: 78, y: 22 },
      { x: 80, y: 54 },
      { x: 64, y: 82 },
      { x: 36, y: 82 },
      { x: 20, y: 54 },
      { x: 50, y: 50 },
    ],
  ];
  const positions = layouts[Math.min(Math.max(nodes.length, 1), 8) - 1];

  return nodes.slice(0, positions.length).map((node, index) => ({
    ...node,
    ...positions[index],
  }));
}

function buildConnectorPath(from: DiagramNodeLayout, to: DiagramNodeLayout) {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}
