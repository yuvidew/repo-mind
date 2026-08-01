import { ArrowRight, Bot, Braces, FileCode2, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Braces,
    title: "Structured repo report",
    description:
      "Summary, tech stack, data flow, architecture notes, risks, and beginner path.",
  },
  {
    icon: Workflow,
    title: "Architecture diagram",
    description:
      "A visual map of the important modules and how the system fits together.",
  },
  {
    icon: FileCode2,
    title: "Key-file guidance",
    description:
      "A practical reading order so users know where to start in an unfamiliar repo.",
  },
  {
    icon: Bot,
    title: "Repo chat surface",
    description:
      "A right-side assistant panel designed for future cited answers from saved context.",
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-16 sm:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-8">
        <div className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <Badge variant="secondary">Workspace modules</Badge>
            <h2 className="font-semibold text-2xl tracking-normal sm:text-3xl">
              Built around the result page developers actually use.
            </h2>
            <p className="text-muted-foreground text-sm leading-6 sm:text-base">
              Each module answers a different question: what is this repo, how
              does it fit together, which files matter, and what should I ask
              next?
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="mt-2 text-muted-foreground text-sm leading-6">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Developer decision panel</p>
              <p className="text-muted-foreground text-xs">
                The workspace turns raw repo data into next actions.
              </p>
            </div>
            <Badge variant="outline">Preview</Badge>
          </div>

          <div className="space-y-3">
            {[
              ["Start here", "Read API routes and services first."],
              ["Architecture", "Follow ingestion to report persistence."],
              ["Risk", "Private token handling needs encryption."],
              ["Question", "Ask chat to explain citation-backed flows."],
            ].map(([label, value]) => (
              <div className="rounded-lg border bg-background p-3" key={label}>
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="mt-1 text-sm leading-6">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border bg-primary/10 p-3 text-primary text-sm">
            Designed for repeated use: scan, inspect, ask, then return to the
            saved repo workspace.
          </div>
        </div>
      </div>
    </section>
  );
};
