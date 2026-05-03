import { BookOpenText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RepositoryAnalysis } from "@/lib/analysis-types";
import { slugify } from "./repo-result-utils";

type RepoSectionNavProps = {
  analysis: RepositoryAnalysis;
};

export const RepoSectionNav = ({ analysis }: RepoSectionNavProps) => {
  const links = [
    { id: "overview", title: "Overview" },
    { id: "diagram", title: "Diagram" },
    { id: "architecture", title: "Architecture" },
    { id: "data-flow", title: "Data flow" },
    ...analysis.wikiSections.map((section) => ({
      id: slugify(section.title),
      title: section.title,
    })),
    { id: "beginner-guide", title: "Beginner guide" },
    { id: "key-files", title: "Key files" },
    { id: "risks", title: "Risks" },
    { id: "debug", title: "Debug" },
  ];

  return (
    <aside className="hidden lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
      <div className="space-y-5 border-r pr-5">
        <div className="flex items-center gap-2 font-semibold">
          <BookOpenText className="size-4 text-primary" />
          Repo Wiki
        </div>
        <nav className="space-y-2">
          <p className="font-medium text-muted-foreground text-xs uppercase">
            On this page
          </p>
          <div className="space-y-1 border-l pl-3">
            {links.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="block text-muted-foreground text-sm leading-5 transition-colors hover:text-foreground"
              >
                {link.title}
              </a>
            ))}
          </div>
        </nav>
        <div className="space-y-2 border-t pt-4 text-muted-foreground text-xs leading-5">
          <p>
            Generated from {analysis.repo.sampledFiles} selected files out of{" "}
            {analysis.repo.fileCount.toLocaleString()} repository files.
          </p>
          <Badge variant="secondary">{analysis.debug.model}</Badge>
        </div>
      </div>
    </aside>
  );
};
