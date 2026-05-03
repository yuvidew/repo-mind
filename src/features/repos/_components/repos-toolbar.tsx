import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RepoStatus } from "./repo-demo-data";

type ReposToolbarProps = {
  searchQuery: string;
  statusFilter: RepoStatus | "ALL";
  submittedCount: number;
  visibleCount: number;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: RepoStatus | "ALL") => void;
};

const filters: Array<{ label: string; value: RepoStatus | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Ready", value: "READY" },
  { label: "Analyzing", value: "ANALYZING" },
  { label: "Failed", value: "FAILED" },
];

export const ReposToolbar = ({
  searchQuery,
  statusFilter,
  submittedCount,
  visibleCount,
  onSearchChange,
  onStatusFilterChange,
}: ReposToolbarProps) => {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search repositories"
            className="h-10 pl-9"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-2 rounded-lg border bg-muted/30 p-1 sm:flex">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={cn(
                  "h-8 rounded-md px-3 font-medium text-sm transition-colors",
                  statusFilter === filter.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={statusFilter === filter.value}
                onClick={() => onStatusFilterChange(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="text-muted-foreground text-sm whitespace-nowrap">
            {visibleCount} of {submittedCount} submitted repos
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
