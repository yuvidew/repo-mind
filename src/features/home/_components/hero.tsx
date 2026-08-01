import {
  Bot,
  FileCode2,
  GitBranch,
  MessageSquareText,
  Network,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RepoUrlForm } from "./repo-url-form";

export const Hero = () => {
  return (
    <section className="border-b bg-background">
      <div className="mx-auto flex min-h-[calc(82svh-3.5rem)] w-full max-w-7xl flex-col items-center justify-center gap-8 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="flex max-w-3xl flex-col items-center gap-5">
          <Badge variant="outline" className="gap-2 rounded-lg px-3 py-1">
            AI repo wiki, diagram, and chat
          </Badge>
          <div className="space-y-4">
            <h1 className="text-balance font-semibold text-4xl tracking-normal sm:text-5xl lg:text-6xl">
              Understand any GitHub repository as a guided developer workspace.
            </h1>
            <p className="mx-auto max-w-2xl text-muted-foreground text-sm leading-6 sm:text-base">
              Paste a repository link and RepoMind turns it into a guided
              report, architecture map, key-file walkthrough, and codebase chat
              surface.
            </p>
          </div>
        </div>

        <RepoUrlForm className="w-full max-w-3xl" />

        <div className="grid w-full max-w-3xl gap-3 text-left text-muted-foreground text-xs sm:grid-cols-3">
          <div className="rounded-lg border bg-background/70 px-3 py-2">
            Public GitHub repos first
          </div>
          <div className="rounded-lg border bg-background/70 px-3 py-2">
            Fast or deep scan mode
          </div>
          <div className="rounded-lg border bg-background/70 px-3 py-2">
            Built for saved reports later
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
      className="mt-4 w-full max-w-6xl overflow-hidden rounded-lg border bg-muted/20 p-3 text-left shadow-sm"
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

        <div className="grid min-h-80 lg:grid-cols-[minmax(0,1fr)_320px]">
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

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="grid min-h-40 place-items-center rounded-lg border bg-muted/20">
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

          <div className="flex min-h-72 flex-col bg-muted/15 p-4">
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
