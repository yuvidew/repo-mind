import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileCode2,
  Gauge,
  GitBranch,
  MessageSquareText,
  Network,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RepoUrlForm } from "./repo-url-form";

export const Hero = () => {
  return (
    <section className="border-b bg-background">
      <div className="mx-auto grid min-h-[calc(86svh-3.5rem)] w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(480px,1.15fr)] lg:px-8">
        <div className="min-w-0 space-y-7">
          <div className="space-y-5">
            <Badge variant="outline" className="gap-2 rounded-lg px-3 py-1">
              <Gauge className="size-3.5" />
              Repo intelligence workspace
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-balance font-semibold text-4xl tracking-normal sm:text-5xl lg:text-6xl">
                Understand any GitHub repo without hunting through files.
              </h1>
              <p className="max-w-2xl text-muted-foreground text-sm leading-6 sm:text-base">
                Paste a repository link and RepoMind turns it into a report,
                interactive architecture map, key-file walkthrough, and cited
                chat workspace.
              </p>
            </div>
          </div>

          <RepoUrlForm className="w-full max-w-2xl" />

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Public repos", "Analyze GitHub projects first"],
              ["Fast or deep", "Choose scan depth per repo"],
              ["Saved context", "Return to reports and chat"],
            ].map(([label, value]) => (
              <div className="rounded-lg border bg-card p-3" key={label}>
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <CheckCircle2 className="size-4" />
                  <p className="font-medium text-sm">{label}</p>
                </div>
                <p className="text-muted-foreground text-xs leading-5">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
            <span>Inspect report</span>
            <ArrowRight className="size-4" />
            <span>Open diagram</span>
            <ArrowRight className="size-4" />
            <span>Ask cited questions</span>
          </div>
        </div>

        <HeroWorkspacePreview />
      </div>
    </section>
  );
};

function HeroWorkspacePreview() {
  return (
    <div
      aria-hidden="true"
      className="w-full min-w-0 overflow-hidden rounded-lg border bg-muted/20 p-3 text-left shadow-sm"
    >
      <div className="rounded-md border bg-background">
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 p-3">
          {["Overview", "Diagram", "Wiki", "Files", "Chat"].map(
            (item, index) => (
              <div
                className={
                  index === 0
                    ? "rounded-md bg-background px-3 py-1.5 font-medium text-xs shadow-sm"
                    : "rounded-md px-3 py-1.5 text-muted-foreground text-xs"
                }
                key={item}
              >
                {item}
              </div>
            ),
          )}
          <Badge className="ml-auto" variant="outline">
            Ready
          </Badge>
        </div>

        <div className="grid min-h-[520px] lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 border-b p-4 lg:border-r lg:border-b-0">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GitBranch className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">owner/repository</p>
                <p className="text-muted-foreground text-xs">
                  Generated repo intelligence workspace
                </p>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_190px]">
              <div className="grid min-h-56 place-items-center rounded-lg border bg-muted/20">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Network className="size-6" />
                  </div>
                  <p className="font-medium text-sm">Architecture diagram</p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    Modules, data flow, and source citations
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  ["Files", "1,248 saved"],
                  ["Sampled", "42 cited"],
                  ["Mode", "Deep scan"],
                ].map(([label, value]) => (
                  <div
                    className="rounded-lg border bg-background p-3"
                    key={label}
                  >
                    <p className="text-muted-foreground text-xs">{label}</p>
                    <p className="mt-1 font-medium text-sm">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex min-h-80 flex-col bg-muted/15 p-4">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="size-4" />
              </div>
              <div>
                <p className="font-medium text-sm">Repo chat</p>
                <p className="text-muted-foreground text-xs">
                  Answers with file citations
                </p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border bg-background p-3 text-muted-foreground">
                Which files should I read first?
              </div>
              <div className="rounded-lg border bg-background p-3">
                Start with the route handlers, repo services, and analyzer
                pipeline.
              </div>
            </div>
            <div className="mt-auto flex h-10 items-center gap-2 rounded-lg border bg-background px-3 text-muted-foreground text-xs">
              <FileCode2 className="size-4" />
              Ask about code, files, or architecture
              <MessageSquareText className="ml-auto size-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
