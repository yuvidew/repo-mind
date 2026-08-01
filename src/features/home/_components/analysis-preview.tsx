import {
  Bot,
  FileCode2,
  FileText,
  GitBranch,
  MessageSquareText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const sectionLinks = ["Overview", "Diagram", "Wiki", "Files", "Chat", "Risks"];

const reportRows = [
  "Explains what the repo does in plain English.",
  "Maps major folders, entry points, and data flow.",
  "Highlights the files worth reading first.",
];

export const AnalysisPreview = () => {
  return (
    <section id="preview" className="border-b py-16 sm:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.55fr] lg:px-8">
        <div className="flex flex-col justify-center gap-4">
          <Badge variant="secondary" className="w-fit gap-2">
            <GitBranch className="size-3.5" /> Result workspace
          </Badge>
          <div className="space-y-3">
            <h2 className="font-semibold text-2xl tracking-normal sm:text-3xl">
              The next screen is built for reading, scanning, and asking.
            </h2>
            <p className="max-w-xl text-muted-foreground text-sm leading-6 sm:text-base">
              After analysis, users land in a repo workspace with section
              navigation, a generated wiki, diagram content, and chat beside the
              report.
            </p>
          </div>
        </div>

        <div className="min-h-[460px] overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 p-3">
            {sectionLinks.map((link, index) => (
              <div
                key={link}
                className={
                  index === 0
                    ? "rounded-md bg-background px-3 py-1.5 font-medium text-sm shadow-sm"
                    : "rounded-md px-3 py-1.5 text-muted-foreground text-sm"
                }
              >
                {link}
              </div>
            ))}
            <Badge className="ml-auto" variant="outline">
              Cited report
            </Badge>
          </div>

          <div className="grid min-h-[410px] lg:grid-cols-[minmax(0,1fr)_300px]">
            <article className="min-w-0 border-b p-5 lg:border-r lg:border-b-0">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <h3 className="mr-auto font-semibold text-xl">owner/repo</h3>
                <Badge variant="outline">main</Badge>
                <Badge variant="outline">AI report</Badge>
              </div>
              <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
                <div className="flex h-44 items-center justify-center rounded-lg border bg-muted/35">
                  <div className="grid gap-3 text-center text-muted-foreground text-xs">
                    <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="size-5" />
                    </div>
                    Architecture diagram preview
                  </div>
                </div>
                <div className="grid gap-3">
                  {["Files scanned", "Citations", "Chat ready"].map(
                    (item, index) => (
                      <div
                        className="rounded-lg border bg-background p-3"
                        key={item}
                      >
                        <p className="text-muted-foreground text-xs">{item}</p>
                        <p className="mt-1 font-medium text-sm">
                          {index === 0 ? "1,248" : index === 1 ? "42" : "Yes"}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {reportRows.map((row) => (
                  <div
                    key={row}
                    className="rounded-lg border bg-background p-3"
                  >
                    <div className="mb-2 h-2 w-24 rounded-full bg-primary/25" />
                    <p className="text-muted-foreground text-sm">{row}</p>
                  </div>
                ))}
              </div>
            </article>

            <aside className="flex bg-muted/15 p-4">
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bot className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">Repo chat</p>
                    <p className="truncate text-muted-foreground text-xs">
                      Context from report and files
                    </p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg border bg-background p-3 text-muted-foreground">
                    Explain the architecture simply.
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    The app splits repo intake, analysis jobs, saved files, and
                    chat retrieval into separate layers.
                  </div>
                </div>
                <div className="mt-auto flex h-10 items-center gap-2 rounded-lg border bg-background px-3 text-muted-foreground text-sm">
                  <FileCode2 className="size-4" />
                  Ask a question
                  <MessageSquareText className="ml-auto size-4" />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
};
