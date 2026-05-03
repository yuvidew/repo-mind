import { Bot, Braces, FileCode2, Workflow } from "lucide-react";

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
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl space-y-3">
          <h2 className="font-semibold text-2xl tracking-normal sm:text-3xl">
            Built around the result page you actually need.
          </h2>
          <p className="text-muted-foreground text-sm leading-6 sm:text-base">
            Every home-page element points users toward the same destination:
            analysis they can read, navigate, and question.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-lg border bg-card p-4"
              >
                <div className="mb-4 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
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
    </section>
  );
};
