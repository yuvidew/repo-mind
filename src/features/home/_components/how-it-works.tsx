import {
  FileSearch,
  MessageCircleQuestion,
  Network,
  WandSparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    icon: FileSearch,
    title: "Paste a repository",
    description:
      "Start with a public GitHub URL and choose a fast or deep scan.",
  },
  {
    icon: Network,
    title: "RepoMind samples files",
    description:
      "Important entry points, config, API, data, and feature files are selected.",
  },
  {
    icon: WandSparkles,
    title: "A report is generated",
    description:
      "The result becomes a guided wiki with diagram and key-file context.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Ask follow-up questions",
    description:
      "Chat becomes the place to dig into architecture and citations.",
  },
];

export const HowItWorks = () => {
  return (
    <section id="flow" className="border-b bg-muted/20 py-16 sm:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(460px,1.1fr)] lg:px-8">
        <div className="flex flex-col justify-center gap-5">
          <Badge variant="secondary" className="w-fit">
            Analysis pipeline
          </Badge>
          <div className="space-y-3">
            <h2 className="font-semibold text-2xl tracking-normal sm:text-3xl">
              From repo link to a workspace users can navigate.
            </h2>
            <p className="max-w-xl text-muted-foreground text-sm leading-6 sm:text-base">
              RepoMind should feel active while it works: each stage maps to a
              visible part of the final report, diagram, files view, or chat
              context.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {["Queue", "Analyze", "Explore"].map((item, index) => (
              <div className="rounded-lg border bg-background p-3" key={item}>
                <p className="text-muted-foreground text-xs">0{index + 1}</p>
                <p className="mt-1 font-medium text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-background p-3 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[210px_minmax(0,1fr)]">
            <div className="space-y-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className={
                      index === 2
                        ? "rounded-lg border border-primary/30 bg-primary/10 p-3"
                        : "rounded-lg border bg-muted/20 p-3"
                    }
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-background text-primary">
                        <Icon className="size-4" />
                      </div>
                      <span className="font-medium text-muted-foreground text-xs">
                        0{index + 1}
                      </span>
                    </div>
                    <p className="font-medium text-sm">{step.title}</p>
                  </div>
                );
              })}
            </div>

            <div className="min-h-[420px] rounded-lg border bg-muted/15 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Generated workspace preview</p>
                  <p className="text-muted-foreground text-xs">
                    Report, diagram, files, and chat unlock together.
                  </p>
                </div>
                <Badge variant="outline">Live</Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Report", "Plain-English explanation and reading path"],
                  ["Diagram", "Nodes and edges from repository structure"],
                  ["Files", "Saved source files with line references"],
                  ["Chat", "Questions grounded in sampled context"],
                ].map(([label, detail]) => (
                  <div
                    className="min-h-28 rounded-lg border bg-background p-4 transition-colors hover:border-primary/40"
                    key={label}
                  >
                    <p className="font-medium text-sm">{label}</p>
                    <p className="mt-2 text-muted-foreground text-xs leading-5">
                      {detail}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg border bg-background p-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-medium">Report generation</span>
                  <span className="text-primary">70%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[70%] rounded-full bg-primary" />
                </div>
                <p className="mt-3 text-muted-foreground text-xs leading-5">
                  The UI mirrors the real pipeline so users understand what is
                  happening while analysis runs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
