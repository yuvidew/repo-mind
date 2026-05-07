"use client";

import { BookOpen, ExternalLink, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingRepoName, setPendingRepoName] = useState<string | null>(null);
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

  const startAnalysis = async (repo: (typeof featuredRepos)[number]) => {
    setError(null);
    setPendingRepoName(repo.name);

    try {
      const response = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "fast", url: repo.url }),
      });
      const data = (await response.json()) as { error?: string; id?: string };

      if (response.status === 401) {
        router.push("/sign-in");
        return;
      }

      if (!response.ok || !data.id) {
        throw new Error(data.error ?? "Unable to create repository.");
      }

      router.push(`/repos/${data.id}`);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
      setPendingRepoName(null);
    }
  };

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
              <Link href="/repos">Analyze your repo</Link>
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
          {error ? <p className="text-destructive text-sm">{error}</p> : null}

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
                    <Button
                      type="button"
                      disabled={pendingRepoName !== null}
                      onClick={() => startAnalysis(repo)}
                    >
                      {pendingRepoName === repo.name ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Search />
                      )}
                      {pendingRepoName === repo.name ? "Opening" : "Analyze"}
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
