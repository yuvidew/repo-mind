import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReposPaginationProps = {
  pageNumber: number;
  totalPages: number;
};

export const ReposPagination = ({
  pageNumber,
  totalPages,
}: ReposPaginationProps) => {
  const isFirstPage = pageNumber <= 1;
  const isLastPage = pageNumber >= totalPages;

  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-sm">
        Page {pageNumber} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" disabled={isFirstPage}>
          <ChevronLeft />
          Previous
        </Button>
        <Button variant="outline" disabled={isLastPage}>
          Next
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
};
