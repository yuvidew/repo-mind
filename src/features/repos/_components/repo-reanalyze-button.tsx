"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type RepoReanalyzeButtonProps = {
  repoId: string;
};

export function RepoReanalyzeButton({ repoId }: RepoReanalyzeButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function reanalyzeDeep() {
    setIsPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/repos/${repoId}/reanalyze`, {
        body: JSON.stringify({ mode: "deep" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Unable to start deep reanalysis.");
      }

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to start deep reanalysis.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button disabled={isPending} onClick={reanalyzeDeep} variant="secondary">
        <RefreshCw className={isPending ? "animate-spin" : ""} />
        {isPending ? "Starting" : "Deep reanalyze"}
      </Button>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
