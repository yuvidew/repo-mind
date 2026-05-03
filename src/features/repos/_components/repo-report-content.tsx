import { FileCode2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RepositoryAnalysis, WikiSection } from "@/lib/analysis-types";
import { RepoDiagram } from "./repo-diagram";
import { slugify } from "./repo-result-utils";

type RepoReportContentProps = {
  analysis: RepositoryAnalysis;
};

export const RepoReportContent = ({ analysis }: RepoReportContentProps) => {
  return (
    <article className="min-w-0 space-y-8 pb-12">
      <section id="overview" className="space-y-3 scroll-mt-24">
        <h2 className="font-semibold text-2xl tracking-normal">Overview</h2>
        <p className="text-muted-foreground text-base leading-8">
          {analysis.plainEnglish}
        </p>
      </section>

      <section id="diagram" className="space-y-3 scroll-mt-24">
        <div className="space-y-1">
          <h2 className="font-semibold text-2xl tracking-normal">Diagram</h2>
          <p className="text-muted-foreground text-sm leading-6">
            A simplified map of the important code layers and how work moves
            through the repository.
          </p>
        </div>
        <RepoDiagram analysis={analysis} />
      </section>

      <TextSection
        id="architecture"
        title="Architecture"
        value={analysis.architecture}
      />
      <TextSection id="data-flow" title="Data flow" value={analysis.dataFlow} />

      {analysis.wikiSections.map((section) => (
        <WikiSectionView key={section.title} section={section} />
      ))}

      <section id="beginner-guide" className="space-y-3 scroll-mt-24">
        <h2 className="font-semibold text-2xl tracking-normal">
          Beginner guide
        </h2>
        <ol className="list-decimal space-y-2 pl-5 text-muted-foreground text-sm leading-7">
          {analysis.beginnerGuide.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section id="key-files" className="space-y-4 scroll-mt-24">
        <div className="space-y-1">
          <h2 className="font-semibold text-2xl tracking-normal">Key files</h2>
          <p className="text-muted-foreground text-sm leading-6">
            Start with these files to understand how the codebase fits together.
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

      <section id="risks" className="grid gap-4 scroll-mt-24 md:grid-cols-2">
        <ListCard title="Tech stack" items={analysis.techStack} />
        <ListCard
          title="Risks and gaps"
          items={analysis.risks}
          tone="warning"
        />
      </section>

      {analysis.warnings.length > 0 ? (
        <ListCard title="Warnings" items={analysis.warnings} tone="warning" />
      ) : null}

      <section id="debug" className="scroll-mt-24">
        <AnalyzerDebug analysis={analysis} />
      </section>
    </article>
  );
};

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
    <section id={id} className="space-y-3 scroll-mt-24">
      <h2 className="font-semibold text-2xl tracking-normal">{title}</h2>
      <p className="text-muted-foreground text-base leading-8">{value}</p>
    </section>
  );
}

function WikiSectionView({ section }: { section: WikiSection }) {
  return (
    <section id={slugify(section.title)} className="space-y-3 scroll-mt-24">
      <h2 className="font-semibold text-2xl tracking-normal">
        {section.title}
      </h2>
      <p className="text-muted-foreground text-base leading-8">
        {section.content}
      </p>
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

function AnalyzerDebug({ analysis }: { analysis: RepositoryAnalysis }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Debug metadata</CardTitle>
        <CardDescription>
          Demo details showing the report source, model, stack, and selected
          files.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <DebugRow label="Source" value={analysis.debug.source} />
          <DebugRow label="Provider" value={analysis.debug.provider} />
          <DebugRow label="Model" value={analysis.debug.model ?? "none"} />
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
