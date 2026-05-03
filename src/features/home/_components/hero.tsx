import { Badge } from "@/components/ui/badge";
import { RepoUrlForm } from "./repo-url-form";

export const Hero = () => {
  return (
    <section className="border-b bg-muted/25">
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-7xl flex-col items-center justify-center gap-8 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="flex max-w-3xl flex-col items-center gap-5">
          <Badge variant="outline" className="gap-2 rounded-lg px-3 py-1">
            AI repo wiki, diagram, and chat
          </Badge>
          <div className="space-y-4">
            <h1 className="text-balance font-semibold text-4xl tracking-normal sm:text-5xl lg:text-6xl">
              Understand any GitHub repository before the code gets noisy.
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
