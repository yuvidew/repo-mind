import {
  FileSearch,
  MessageCircleQuestion,
  Network,
  WandSparkles,
} from "lucide-react";

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
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl space-y-3">
          <h2 className="font-semibold text-2xl tracking-normal sm:text-3xl">
            From repo link to readable context.
          </h2>
          <p className="text-muted-foreground text-sm leading-6 sm:text-base">
            The UI is designed around one simple workflow so the product feels
            usable before the heavier persistence and chat systems land.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="rounded-lg border bg-background p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <span className="font-medium text-muted-foreground text-xs">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="font-medium">{step.title}</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-6">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
