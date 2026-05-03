import { SearchX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const ReposEmptyState = () => {
  return (
    <Empty className="min-h-72 border bg-muted/15">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>No repositories found</EmptyTitle>
        <EmptyDescription>
          Try a different search or status filter, or submit a new repository.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link href="/">Submit repository</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
};
