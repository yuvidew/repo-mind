"use client";

import { Loader2, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AnalysisMode } from "@/lib/analysis-types";
import { cn } from "@/lib/utils";

const exampleRepo = "https://github.com/vercel/next.js";

export const AddRepositoryDialog = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<AnalysisMode>("fast");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
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
    router.push(
      `/analyze?repo=${encodeURIComponent(normalizedUrl)}&mode=${mode}`,
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Add repository
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Add repository</DialogTitle>
          <DialogDescription>
            Paste a GitHub repository link and choose how much context RepoMind
            should scan first.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repo-url">Repository URL</Label>
            <Input
              id="repo-url"
              className="h-10"
              placeholder={exampleRepo}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Analysis mode</Label>
            <div className="grid grid-cols-2 rounded-lg border bg-muted/35 p-1">
              <ModeButton
                description="Quick scan for normal repos"
                isActive={mode === "fast"}
                label="Fast"
                onClick={() => setMode("fast")}
              />
              <ModeButton
                description="More files and model time"
                isActive={mode === "deep"}
                label="Deep"
                onClick={() => setMode("deep")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : <Search />}
              {isPending ? "Opening" : "Start analysis"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

function ModeButton({
  description,
  isActive,
  label,
  onClick,
}: {
  description: string;
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-md px-3 py-2 text-left transition-colors",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-pressed={isActive}
      onClick={onClick}
    >
      <span className="block font-medium text-sm">{label}</span>
      <span className="block text-xs leading-5">{description}</span>
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
