"use client";

import {
  BookOpenText,
  Bot,
  FileCode2,
  GitBranch,
  MessageSquareText,
  Network,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RepositoryAnalysis, WikiSection } from "@/lib/analysis-types";
import { RepoChatPanel } from "./repo-chat-panel";
import { RepoCitationLink } from "./repo-citation-link";
import type { DemoRepo } from "./repo-demo-data";
import { RepoDiagram } from "./repo-diagram";
import { RepoFilesSection } from "./repo-files-section";
import { slugify } from "./repo-result-utils";
import { SectionShareButton } from "./section-share-button";

type RepoReportContentProps = {
  analysis: RepositoryAnalysis;
  repo: DemoRepo;
  repoId: string;
};

type FileOpenRequest = {
  endLine?: number;
  id: string;
  path: string;
  startLine?: number;
};

export const RepoReportContent = ({
  analysis,
  repo,
  repoId,
}: RepoReportContentProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [fileOpenRequest, setFileOpenRequest] =
    useState<FileOpenRequest | null>(null);
  const defaultWikiSections = analysis.wikiSections
    .slice(0, 2)
    .map((section) => slugify(section.title));
  const tabs = [
    { icon: BookOpenText, label: "Overview", value: "overview" },
    { icon: Network, label: "Diagram", value: "diagram" },
    { icon: GitBranch, label: "Wiki", value: "wiki" },
    { icon: FileCode2, label: "Files", value: "files" },
    { icon: Bot, label: "Chat", value: "chat" },
    { icon: ShieldAlert, label: "Risks", value: "risks" },
    { icon: MessageSquareText, label: "Debug", value: "debug" },
  ];

  useEffect(() => {
    const openFilesTab = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        endLine?: number;
        path?: string;
        startLine?: number;
      };

      if (detail.path) {
        setFileOpenRequest({
          endLine: detail.endLine,
          id: crypto.randomUUID(),
          path: detail.path,
          startLine: detail.startLine,
        });
      }

      setActiveTab("files");
    };

    window.addEventListener("repomind:open-file", openFilesTab);

    return () => {
      window.removeEventListener("repomind:open-file", openFilesTab);
    };
  }, []);

  return (
    <article className="min-w-0 pb-12">
      <Tabs className="gap-5" onValueChange={setActiveTab} value={activeTab}>
        <div className="sticky top-3 z-20 rounded-lg border bg-background/95 p-2 shadow-sm backdrop-blur">
          <TabsList
            className="flex h-auto w-full flex-wrap justify-start rounded-md bg-transparent p-0"
            variant="line"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <TabsTrigger
                  className="h-9 flex-none px-3"
                  key={tab.value}
                  value={tab.value}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent className="space-y-6" value="overview">
          <ReportNotice analysis={analysis} />
          <SourceCoverage analysis={analysis} />

          <section
            id="overview"
            className="space-y-3 rounded-lg border bg-background p-5 shadow-sm scroll-mt-24"
          >
            <SectionTitle id="overview" title="Overview" />
            <p className="text-muted-foreground text-base leading-8 wrap-anywhere">
              {analysis.plainEnglish}
            </p>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <TextSection
              id="architecture"
              title="Architecture"
              value={analysis.architecture}
            />
            <TextSection
              id="data-flow"
              title="Data flow"
              value={analysis.dataFlow}
            />
          </div>

          <section
            id="beginner-guide"
            className="space-y-3 rounded-lg border bg-background p-5 shadow-sm scroll-mt-24"
          >
            <SectionTitle id="beginner-guide" title="Beginner guide" />
            <ol className="list-decimal space-y-2 pl-5 text-muted-foreground text-sm leading-7 wrap-anywhere">
              {analysis.beginnerGuide.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>

          <section
            id="key-files"
            className="space-y-4 rounded-lg border bg-background p-5 shadow-sm scroll-mt-24"
          >
            <div className="space-y-1">
              <SectionTitle id="key-files" title="Key files" />
              <p className="text-muted-foreground text-sm leading-6">
                Start with these files to understand how the codebase fits
                together.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {analysis.keyFiles.map((file) => (
                <div
                  key={file.path}
                  className="rounded-lg border bg-muted/15 p-3"
                >
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <FileCode2 className="size-4 text-primary" />
                    <span className="break-all">{file.path}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground text-sm leading-6 wrap-anywhere">
                    {file.purpose}
                  </p>
                  {file.citation ? (
                    <RepoCitationLink
                      citation={file.citation}
                      className="mt-2"
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent className="space-y-6" value="diagram">
          <section
            id="diagram"
            className="space-y-3 rounded-lg border bg-background p-5 shadow-sm scroll-mt-24"
          >
            <div className="space-y-1">
              <SectionTitle id="diagram" title="Diagram" />
              <p className="text-muted-foreground text-sm leading-6">
                A simplified map of the important code layers and how work moves
                through the repository.
              </p>
            </div>
            <RepoDiagram analysis={analysis} />
          </section>
        </TabsContent>

        <TabsContent className="space-y-4" value="wiki">
          <section
            id="wiki"
            className="space-y-3 rounded-lg border bg-background p-5 shadow-sm scroll-mt-24"
          >
            <h2 className="font-semibold text-2xl tracking-normal">
              Repo wiki
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              Generated sections from the selected repository files and report
              context.
            </p>
          </section>
          <Accordion
            className="space-y-4"
            defaultValue={defaultWikiSections}
            type="multiple"
          >
            {analysis.wikiSections.map((section) => (
              <WikiSectionView key={section.title} section={section} />
            ))}
          </Accordion>
        </TabsContent>

        <TabsContent className="space-y-6" value="files">
          <RepoFilesSection
            analyzedRef={
              analysis.provenance.analyzedCommitSha ??
              analysis.repo.defaultBranch
            }
            openRequest={fileOpenRequest}
            repoId={repoId}
            repoUrl={analysis.repo.url}
          />
        </TabsContent>

        <TabsContent value="chat">
          <section id="chat" className="scroll-mt-24">
            <RepoChatPanel layout="tab" repo={repo} />
          </section>
        </TabsContent>

        <TabsContent className="space-y-6" value="risks">
          <section
            id="risks"
            className="grid gap-4 scroll-mt-24 md:grid-cols-2"
          >
            <ListCard title="Tech stack" items={analysis.techStack} />
            <ListCard
              title="Risks and gaps"
              items={analysis.risks}
              tone="warning"
            />
          </section>

          {analysis.warnings.length > 0 ? (
            <ListCard
              title="Warnings"
              items={analysis.warnings}
              tone="warning"
            />
          ) : null}
        </TabsContent>

        <TabsContent value="debug">
          <AnalyzerDebug analysis={analysis} />
        </TabsContent>
      </Tabs>
    </article>
  );
};

function ReportNotice({ analysis }: { analysis: RepositoryAnalysis }) {
  const isFallback = analysis.debug.source === "fallback";
  const hasNoSource = analysis.repo.sampledFiles === 0;
  const hasLowContext = analysis.repo.sampledFiles < 8;

  if (!(isFallback || hasLowContext)) return null;

  const title = hasNoSource
    ? "No readable source sampled"
    : isFallback
      ? "Fallback report generated"
      : "Limited source context";
  const description = hasNoSource
    ? "RepoMind could read the repository tree, but it did not find readable source files to sample. The report and chat are intentionally high level."
    : isFallback
      ? "The AI report was not available in time, so RepoMind generated this report from the repository tree and sampled code. Use Deep reanalyze for a fuller AI-generated explanation."
      : "This repository has very little analyzable source code, so some sections and chat answers may be less detailed than usual.";

  return (
    <Alert
      className={
        isFallback || hasNoSource
          ? "border-amber-500/30 bg-amber-500/10"
          : "border-primary/20 bg-primary/5"
      }
    >
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}

function SourceCoverage({ analysis }: { analysis: RepositoryAnalysis }) {
  const coverageItems = [
    { label: "Files found", value: analysis.repo.fileCount.toLocaleString() },
    {
      label: "Files sampled",
      value: analysis.repo.sampledFiles.toLocaleString(),
    },
    { label: "Mode", value: `${analysis.repo.analysisMode} mode` },
    { label: "Report source", value: analysis.debug.source },
    {
      label: "Tree truncated",
      value: analysis.debug.treeTruncated ? "yes" : "no",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {coverageItems.map((item) => (
        <div
          key={item.label}
          className="min-w-0 rounded-lg border bg-background p-4 shadow-sm"
        >
          <p className="text-muted-foreground text-xs uppercase tracking-normal">
            {item.label}
          </p>
          <p className="mt-1 truncate font-medium text-sm capitalize">
            {item.value}
          </p>
        </div>
      ))}
    </section>
  );
}

function TextSection({
  id,
  title,
  value,
}: {
  id: string;
  title: string;
  value: string;
}) {
  return (
    <section
      id={id}
      className="min-w-0 space-y-3 rounded-lg border bg-background p-5 shadow-sm scroll-mt-24"
    >
      <SectionTitle id={id} title={title} />
      <p className="text-muted-foreground text-base leading-8 wrap-anywhere">
        {value}
      </p>
    </section>
  );
}

function SectionTitle({ id, title }: { id: string; title: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <h2 className="min-w-0 font-semibold text-2xl tracking-normal wrap-anywhere">
        {title}
      </h2>
      <SectionShareButton sectionId={id} title={title} />
    </div>
  );
}

function WikiSectionView({ section }: { section: WikiSection }) {
  const id = slugify(section.title);

  return (
    <section id={id} className="scroll-mt-24">
      <AccordionItem
        className="rounded-lg border bg-background px-4 shadow-sm"
        value={id}
      >
        <div className="flex items-center gap-3">
          <AccordionTrigger className="min-w-0 flex-1 items-center gap-3 py-4 text-xl hover:no-underline">
            <span className="min-w-0 flex-1 truncate">{section.title}</span>
          </AccordionTrigger>
          <SectionShareButton sectionId={id} title={section.title} />
        </div>
        <AccordionContent className="pb-4">
          <p className="text-muted-foreground text-base leading-8 wrap-anywhere">
            {section.content}
          </p>
          {section.citations && section.citations.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {section.citations.map((citation) => (
                <RepoCitationLink
                  citation={citation}
                  key={`${section.title}-${citation.path}-${citation.startLine ?? ""}`}
                />
              ))}
            </div>
          ) : null}
        </AccordionContent>
      </AccordionItem>
    </section>
  );
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
    <Card className="bg-background shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm leading-6 wrap-anywhere">
            Not enough sampled source context to identify this yet.
          </p>
        ) : null}
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
              <span className="min-w-0 wrap-anywhere">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function AnalyzerDebug({ analysis }: { analysis: RepositoryAnalysis }) {
  return (
    <section id="debug" className="scroll-mt-24">
      <Collapsible>
        <Card className="bg-background shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Debug metadata</CardTitle>
                <CardDescription>
                  Report source, model, stack, and selected files.
                </CardDescription>
              </div>
              <CollapsibleTrigger asChild>
                <Badge className="cursor-pointer" variant="outline">
                  Show details
                </Badge>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <DebugRow label="Source" value={analysis.debug.source} />
                <DebugRow label="Provider" value={analysis.debug.provider} />
                <DebugRow
                  label="Model"
                  value={analysis.debug.model ?? "none"}
                />
                <DebugRow
                  label="Tree truncated"
                  value={analysis.debug.treeTruncated ? "yes" : "no"}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.debug.detectedStack.map((item) => (
                  <Badge key={item} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
              <div className="space-y-2">
                <p className="font-medium text-sm">Selected files</p>
                <div className="max-h-44 space-y-1 overflow-auto rounded-lg border bg-muted/20 p-2">
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
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </section>
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
