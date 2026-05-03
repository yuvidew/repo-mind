import { Bot, FileText, GitBranch, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const sectionLinks = [
    "Overview",
    "Architecture Diagram",
    "Command Surface",
    "Key Files",
    "Risks",
];

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

                <div className="grid min-h-[430px] overflow-hidden rounded-lg border bg-card shadow-sm lg:grid-cols-[170px_minmax(0,1fr)_240px]">
                    <aside className="hidden border-r bg-muted/25 p-4 lg:block">
                        <p className="mb-4 font-medium text-muted-foreground text-xs uppercase">
                            On this page
                        </p>
                        <nav className="space-y-2 border-l pl-3">
                            {sectionLinks.map((link, index) => (
                                <div
                                    key={link}
                                    className={
                                        index === 0
                                            ? "font-medium text-foreground text-sm"
                                            : "text-muted-foreground text-sm"
                                    }
                                >
                                    {link}
                                </div>
                            ))}
                        </nav>
                        <div className="mt-16 border-t pt-4 text-muted-foreground text-xs leading-5">
                            Generated from selected files with model-backed analysis.
                        </div>
                    </aside>

                    <article className="min-w-0 border-r p-5">
                        <div className="mb-5 flex flex-wrap items-center gap-2">
                            <h3 className="mr-auto font-semibold text-xl">owner/repo</h3>
                            <Badge variant="outline">main</Badge>
                            <Badge variant="outline">AI report</Badge>
                        </div>
                        <div className="mb-5 flex h-40 items-center justify-center rounded-lg border bg-muted/35">
                            <div className="grid gap-3 text-center text-muted-foreground text-xs">
                                <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <FileText className="size-5" />
                                </div>
                                Architecture diagram preview
                            </div>
                        </div>
                        <div className="space-y-3">
                            {reportRows.map((row) => (
                                <div key={row} className="rounded-lg border bg-background p-3">
                                    <div className="mb-2 h-2 w-24 rounded-full bg-primary/25" />
                                    <p className="text-muted-foreground text-sm">{row}</p>
                                </div>
                            ))}
                        </div>
                    </article>

                    <aside className="hidden bg-muted/15 p-4 md:flex md:flex-col">
                        <div className="mb-auto flex flex-1 flex-col items-center justify-center text-center">
                            <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Bot className="size-6" />
                            </div>
                            <p className="font-medium">Ask about this repository</p>
                            <p className="mt-2 text-muted-foreground text-xs leading-5">
                                Chat will use the report and cited files once repo context is
                                persisted.
                            </p>
                        </div>
                        <div className="flex h-10 items-center gap-2 rounded-lg border bg-background px-3 text-muted-foreground text-sm">
                            Ask a question
                            <MessageSquareText className="ml-auto size-4" />
                        </div>
                    </aside>
                </div>
            </div>
        </section>
    );
};
