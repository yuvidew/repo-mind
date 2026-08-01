import {
  Bot,
  BrainCircuit,
  FileCode2,
  FileSearch,
  GitBranch,
  History,
  type LucideIcon,
  MessageSquareText,
  Network,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RepoUrlForm } from "./repo-url-form";

const railItems = [
  { icon: Plus, label: "New analysis" },
  { icon: Search, label: "Search repos" },
  { icon: GitBranch, label: "Repositories" },
  { icon: History, label: "History" },
] satisfies Array<{
  icon: LucideIcon;
  label: string;
}>;

const starterCards = [
  {
    description: "Routes, services, jobs, and persistence.",
    icon: Network,
    title: "Map architecture",
  },
  {
    description: "Entry points, config, and source paths.",
    icon: FileSearch,
    title: "Find key files",
  },
  {
    description: "Trace requests from UI to database.",
    icon: GitBranch,
    title: "Follow data flow",
  },
  {
    description: "Spot missing tests and risky areas.",
    icon: FileCode2,
    title: "Review code risk",
  },
] satisfies Array<{
  description: string;
  icon: LucideIcon;
  title: string;
}>;

const contextPills = ["Report", "Diagram", "Files", "Chat"];

export const Hero = () => {
  return (
    <section className="border-b bg-background">
      <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-lg border bg-card shadow-sm lg:grid-cols-[76px_minmax(0,1fr)]">
          <aside className="hidden border-r bg-muted/20 p-3 lg:flex lg:flex-col lg:items-center lg:justify-between">
            <div className="flex flex-col items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BrainCircuit className="size-5" />
              </span>
              <span className="h-px w-10 bg-border" />
              <div className="grid gap-2">
                {railItems.map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <span
                      className={cn(
                        "flex size-10 items-center justify-center rounded-lg border text-muted-foreground",
                        index === 0
                          ? "bg-background text-foreground shadow-sm"
                          : "bg-transparent",
                      )}
                      key={item.label}
                      title={item.label}
                    >
                      <Icon className="size-4" />
                      <span className="sr-only">{item.label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
            <span
              className="flex size-10 items-center justify-center rounded-lg border text-muted-foreground"
              title="Settings"
            >
              <Settings className="size-4" />
              <span className="sr-only">Settings</span>
            </span>
          </aside>

          <div className="relative min-w-0 overflow-hidden bg-background">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-45 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px]"
            />
            <div className="relative mx-auto flex min-h-[calc(100svh-6.5rem)] w-full max-w-4xl flex-col justify-center px-5 py-10 sm:px-8 lg:px-12">
              <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
                <Badge variant="secondary" className="gap-2 rounded-lg">
                  <Sparkles className="size-3.5" />
                  Repo assistant
                </Badge>
                <div className="flex flex-wrap items-center gap-2">
                  {contextPills.map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl font-semibold text-4xl tracking-normal sm:text-5xl lg:text-6xl">
                  Hi there. What repo would you like to understand?
                </h1>
                <p className="max-w-2xl text-muted-foreground text-sm leading-6 sm:text-base">
                  Drop in a GitHub URL and RepoMind builds a guided workspace
                  for reading the report, diagram, files, and repo chat.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {starterCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <div
                      className="min-h-32 rounded-lg border bg-card/95 p-4 shadow-sm transition-colors hover:border-primary/40"
                      key={card.title}
                    >
                      <div className="mb-4 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <h2 className="font-medium text-sm">{card.title}</h2>
                      <p className="mt-2 text-muted-foreground text-xs leading-5">
                        {card.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 rounded-lg border bg-card/95 p-2 shadow-sm">
                <RepoUrlForm className="border-0 bg-transparent p-0 shadow-none" />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
                <span className="inline-flex items-center gap-2">
                  <Bot className="size-4 text-primary" />
                  Ask follow-up questions after analysis
                </span>
                <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:inline-flex" />
                <span className="inline-flex items-center gap-2">
                  <MessageSquareText className="size-4 text-primary" />
                  Answers stay tied to repository context
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
