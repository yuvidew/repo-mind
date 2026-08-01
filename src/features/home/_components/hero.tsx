import { Bot, FileCode2, GitBranch, Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RepoUrlForm } from "./repo-url-form";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden border-b bg-background">
      <div
        aria-hidden="true"
        className="-bottom-32 absolute inset-x-4 mx-auto hidden max-w-5xl rounded-lg border bg-muted/25 p-4 shadow-sm sm:block"
      >
        <div className="grid h-80 overflow-hidden rounded-md border bg-background lg:grid-cols-[180px_minmax(0,1fr)_240px]">
          <div className="border-r bg-muted/25 p-4">
            <div className="mb-5 flex items-center gap-2 font-medium text-sm">
              <GitBranch className="size-4 text-primary" />
              Repo Wiki
            </div>
            <div className="space-y-2">
              {["Overview", "Diagram", "Files", "Risks"].map((item) => (
                <div
                  className="h-8 rounded-md border bg-background px-3 py-2 text-muted-foreground text-xs"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="border-r p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="h-5 w-36 rounded-md bg-foreground/15" />
              <Badge variant="outline">Ready</Badge>
            </div>
            <div className="mb-4 grid h-28 place-items-center rounded-lg border bg-muted/25">
              <Network className="size-8 text-primary" />
            </div>
            <div className="grid gap-3">
              <div className="h-16 rounded-lg border bg-muted/15" />
              <div className="h-16 rounded-lg border bg-muted/15" />
            </div>
          </div>
          <div className="flex flex-col bg-muted/20 p-4">
            <div className="mb-auto grid flex-1 place-items-center text-center">
              <div>
                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bot className="size-5" />
                </div>
                <p className="font-medium text-sm">Repo chat</p>
              </div>
            </div>
            <div className="flex h-10 items-center gap-2 rounded-lg border bg-background px-3 text-muted-foreground text-xs">
              <FileCode2 className="size-4" />
              Ask with citations
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(86svh-3.5rem)] w-full max-w-7xl flex-col items-center justify-center gap-8 px-4 pt-16 pb-36 text-center sm:px-6 lg:px-8">
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
      </div>
    </section>
  );
};
