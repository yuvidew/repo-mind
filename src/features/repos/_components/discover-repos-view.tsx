"use client";

import { BookOpen, ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const featuredRepos = [
  {
    description:
      "A large App Router codebase for testing framework-heavy reports.",
    language: "TypeScript",
    name: "vercel/next.js",
    tags: ["framework", "react", "docs"],
    url: "https://github.com/vercel/next.js",
  },
  {
    description: "A practical UI library with components, docs, and examples.",
    language: "TypeScript",
    name: "shadcn-ui/ui",
    tags: ["ui", "components", "tailwind"],
    url: "https://github.com/shadcn-ui/ui",
  },
  {
    description: "A backend-heavy repository with queues, database, and APIs.",
    language: "TypeScript",
    name: "calcom/cal.com",
    tags: ["saas", "api", "database"],
    url: "https://github.com/calcom/cal.com",
  },
  {
    description:
      "A compact codebase that is useful for quick onboarding tests.",
    language: "TypeScript",
    name: "pmndrs/zustand",
    tags: ["state", "library", "small"],
    url: "https://github.com/pmndrs/zustand",
  },
];

export const DiscoverReposView = () => {
  const [query, setQuery] = useState("");
  const visibleRepos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return featuredRepos;

    return featuredRepos.filter((repo) =>
      [repo.name, repo.description, repo.language, ...repo.tags]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Link href="/" className="font-semibold text-primary text-sm">
              RepoMind
            </Link>
            <h1 className="font-semibold text-3xl tracking-normal">
              Discover repositories
            </h1>
            <p className="max-w-2xl text-muted-foreground text-sm leading-6">
              Start with real GitHub projects that exercise diagrams, wiki
              sections, citations, source browsing, and repo chat.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/docs">
                <BookOpen />
                Docs
              </Link>
            </Button>
            <Button asChild>
              <Link href="/sign-in">Analyze your repo</Link>
            </Button>
          </div>
        </header>

        <section className="space-y-4">
          <div className="relative max-w-xl">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by repo, stack, or topic"
              value={query}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {visibleRepos.map((repo) => (
              <Card key={repo.name}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg">{repo.name}</CardTitle>
                    <Badge variant="outline">{repo.language}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm leading-6">
                    {repo.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {repo.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                      <a href={repo.url} target="_blank" rel="noreferrer">
                        <ExternalLink />
                        GitHub
                      </a>
                    </Button>
                    <Button asChild>
                      <Link href="/sign-in">Analyze</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};
