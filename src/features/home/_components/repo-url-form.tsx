"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AnalysisMode } from "@/lib/analysis-types";
import { cn } from "@/lib/utils";

type RepoUrlFormProps = {
  className?: string;
};

const exampleRepo = "https://github.com/vercel/next.js";

export const RepoUrlForm = ({ className }: RepoUrlFormProps) => {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<AnalysisMode>("fast");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedUrl = normalizeGitHubRepoUrl(url);

    if (!normalizedUrl) {
      setError(
        "Enter a GitHub repository URL like https://github.com/owner/repo.",
      );
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, url: normalizedUrl }),
      });
      const data = (await response.json()) as { error?: string; id?: string };

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
      setIsPending(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "rounded-lg border bg-background p-2 text-left shadow-sm",
        className,
      )}
    >
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <Input
          aria-label="GitHub repository URL"
          className="h-11 px-3"
          placeholder={exampleRepo}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <div className="grid grid-cols-2 rounded-lg border bg-muted/35 p-1">
          <ModeButton
            isActive={mode === "fast"}
            label="Fast"
            onClick={() => setMode("fast")}
          />
          <ModeButton
            isActive={mode === "deep"}
            label="Deep"
            onClick={() => setMode("deep")}
          />
        </div>
        <Button type="submit" className="h-11 min-w-36" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : <Search />}
          {isPending ? "Opening" : "Analyze repo"}
        </Button>
      </div>
      {error ? (
        <p className="mt-2 px-1 text-destructive text-sm">{error}</p>
      ) : null}
    </form>
  );
};

function ModeButton({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "h-9 rounded-md px-4 font-medium text-sm transition-colors",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-pressed={isActive}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function normalizeGitHubRepoUrl(input: string) {
  try {
    const parsedUrl = new URL(input.trim());
    const isGitHub =
      parsedUrl.hostname === "github.com" ||
      parsedUrl.hostname === "www.github.com";
    const [owner, repo] = parsedUrl.pathname.split("/").filter(Boolean);

    if (!isGitHub || !owner || !repo) {
      return null;
    }

    parsedUrl.hash = "";
    parsedUrl.search = "";
    parsedUrl.pathname = `/${owner}/${repo.replace(/\.git$/, "")}`;
    return parsedUrl.toString();
  } catch {
    return null;
  }
}
