"use client";

import { BrainCircuit } from "lucide-react";
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
import { demoRepos, type RepoStatus } from "./repo-demo-data";
import { ReposEmptyState } from "./repos-empty-state";
import { ReposGrid } from "./repos-grid";
import { ReposPagination } from "./repos-pagination";
import { ReposToolbar } from "./repos-toolbar";

const pageNumber = 1;
const totalPages = 1;

const ReposView = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RepoStatus | "ALL">("ALL");

  const filteredRepos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return demoRepos.filter((repo) => {
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
  }, [searchQuery, statusFilter]);

  return (
    <main className="flex min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
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
          <div className="space-y-2">
            <h1 className="font-semibold text-3xl tracking-normal">
              Repositories
            </h1>
            <p className="max-w-2xl text-muted-foreground text-sm leading-6">
              Track submitted repositories, review analysis status, and open
              generated repo workspaces.
            </p>
          </div>
          <AddRepositoryDialog />
        </section>

        <ReposToolbar
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          submittedCount={demoRepos.length}
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
