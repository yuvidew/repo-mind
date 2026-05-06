import {
  BrainCircuit,
  FileCode2,
  GitCommitHorizontal,
  MessageSquareText,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Docs | RepoMind",
  description: "RepoMind product guide, FAQ, and analysis workflow.",
};

const docs = [
  {
    icon: BrainCircuit,
    title: "Reports",
    value:
      "RepoMind turns a GitHub repository into an overview, architecture notes, data flow, wiki sections, key files, and risks.",
  },
  {
    icon: FileCode2,
    title: "Citations",
    value:
      "Cited files open inside the Files viewer with line highlighting, plus an external GitHub link when commit URLs are available.",
  },
  {
    icon: GitCommitHorizontal,
    title: "Freshness",
    value:
      "Each analysis stores the analyzed commit. The freshness check compares it with the latest default-branch commit.",
  },
  {
    icon: MessageSquareText,
    title: "Repo chat",
    value:
      "Chat answers stream from the saved report, sampled files, and repo chunks so questions stay scoped to the analyzed codebase.",
  },
];

const faqs = [
  {
    question: "Which repositories can RepoMind analyze?",
    answer:
      "The current MVP supports GitHub repository URLs. Public repositories work through the GitHub API, and private access depends on the connected auth setup.",
  },
  {
    question: "What is the difference between Fast and Deep mode?",
    answer:
      "Fast mode favors a quicker first report. Deep mode samples more context and is better for larger or unfamiliar codebases.",
  },
  {
    question: "Why can a report become stale?",
    answer:
      "A report is stale when the repository branch has moved past the commit that RepoMind analyzed. Reanalyze to refresh the report and chat context.",
  },
];

const DocsPage = () => (
  <main className="min-h-screen bg-background text-foreground">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Link href="/" className="font-semibold text-primary text-sm">
            RepoMind
          </Link>
          <h1 className="font-semibold text-3xl tracking-normal">Docs</h1>
          <p className="max-w-2xl text-muted-foreground text-sm leading-6">
            A compact guide to the analysis workflow, citations, freshness, and
            repo chat behavior.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/discover">Discover repos</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-in">Start analysis</Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {docs.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <item.icon className="size-5 text-primary" />
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm leading-6">
                {item.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-2xl tracking-normal">FAQ</h2>
          <Badge variant="outline">MVP</Badge>
        </div>
        <div className="grid gap-3">
          {faqs.map((faq) => (
            <Card key={faq.question}>
              <CardHeader>
                <CardTitle className="text-base">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-6">
                  {faq.answer}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  </main>
);

export default DocsPage;
