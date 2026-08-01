"use client";

import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  FolderGit2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AddRepositoryDialog } from "./add-repository-dialog";
import type { DemoRepo, RepoStatus } from "./repo-demo-data";
import { ReposEmptyState } from "./repos-empty-state";
import { ReposGrid } from "./repos-grid";
import { ReposPagination } from "./repos-pagination";
import { ReposToolbar } from "./repos-toolbar";

const pageNumber = 1;
const totalPages = 1;

type ReposViewProps = {
  repos: DemoRepo[];
};

const ReposView = ({ repos }: ReposViewProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RepoStatus | "ALL">("ALL");

  const repoMetrics = useMemo(() => {
    const readyCount = repos.filter((repo) => repo.status === "READY").length;
    const analyzingCount = repos.filter(
      (repo) => repo.status === "ANALYZING",
    ).length;
    const failedCount = repos.filter((repo) => repo.status === "FAILED").length;

    return [
      {
        description: "Saved repo workspaces",
        icon: FolderGit2,
        label: "Submitted",
        value: repos.length,
      },
      {
        description: "Ready to read and chat",
        icon: CheckCircle2,
        label: "Ready",
        value: readyCount,
      },
      {
        description: "Analysis still running",
        icon: Clock3,
        label: "Analyzing",
        value: analyzingCount,
      },
      {
        description: "Need review or retry",
        icon: AlertCircle,
        label: "Failed",
        value: failedCount,
      },
    ];
  }, [repos]);

  const filteredRepos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return repos.filter((repo) => {
      const matchesStatus =
        statusFilter === "ALL" || repo.status === statusFilter;
      const matchesSearch =
        query.length === 0 ||
        [repo.owner, repo.name, repo.description, repo.language]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [repos, searchQuery, statusFilter]);

  return (
    <main className="flex min-h-screen bg-muted/20 text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/" className="flex w-fit items-center gap-2 font-semibold">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BrainCircuit className="size-5" />
          </span>
          <span>RepoMind</span>
        </Link>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Repositories</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="font-medium text-primary text-sm">
              Developer repo workspace
            </p>
            <h1 className="font-semibold text-3xl tracking-normal sm:text-4xl">
              Repositories
            </h1>
            <p className="text-muted-foreground text-sm leading-6">
              Track every submitted codebase, scan analysis status, and open the
              generated report, file viewer, and repo chat from one place.
            </p>
          </div>
          <AddRepositoryDialog />
        </section>

        <section
          aria-label="Repository status summary"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {repoMetrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <div
                className="rounded-lg border bg-background p-4 shadow-sm"
                key={metric.label}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs uppercase tracking-normal">
                      {metric.label}
                    </p>
                    <p className="mt-2 font-semibold text-2xl">
                      {metric.value.toLocaleString()}
                    </p>
                  </div>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                </div>
                <p className="mt-3 text-muted-foreground text-sm">
                  {metric.description}
                </p>
              </div>
            );
          })}
        </section>

        <ReposToolbar
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          submittedCount={repos.length}
          visibleCount={filteredRepos.length}
          onSearchChange={setSearchQuery}
          onStatusFilterChange={setStatusFilter}
        />

        {filteredRepos.length > 0 ? (
          <ReposGrid repos={filteredRepos} />
        ) : (
          <ReposEmptyState />
        )}

        <div className="mt-auto">
          <ReposPagination pageNumber={pageNumber} totalPages={totalPages} />
        </div>
      </div>
    </main>
  );
};

export default ReposView;
