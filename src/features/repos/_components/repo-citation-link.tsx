"use client";

import { ExternalLink, FileCode2 } from "lucide-react";
import type { SourceCitation } from "@/lib/analysis-types";
import { cn } from "@/lib/utils";

type RepoCitationLinkProps = {
  citation: SourceCitation;
  className?: string;
};

export const RepoCitationLink = ({
  citation,
  className,
}: RepoCitationLinkProps) => {
  const label = citation.label ?? citation.path;
  const lineLabel = citation.startLine
    ? citation.endLine && citation.endLine !== citation.startLine
      ? `:${citation.startLine}-${citation.endLine}`
      : `:${citation.startLine}`
    : "";

  const openCitation = () => {
    window.dispatchEvent(
      new CustomEvent("repomind:open-file", {
        detail: {
          endLine: citation.endLine,
          path: citation.path,
          startLine: citation.startLine,
        },
      }),
    );

    document.getElementById("files")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <span
      className={cn("inline-flex max-w-full items-center gap-1", className)}
    >
      <button
        className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
        onClick={openCitation}
        type="button"
      >
        <FileCode2 className="size-3.5 shrink-0" />
        <span className="truncate">
          {label}
          {lineLabel}
        </span>
      </button>
      {citation.url ? (
        <a
          aria-label={`Open ${label} on GitHub`}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:text-foreground"
          href={citation.url}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink className="size-3.5" />
        </a>
      ) : null}
    </span>
  );
};
