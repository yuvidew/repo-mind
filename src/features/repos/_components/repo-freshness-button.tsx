"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type RepoFreshnessButtonProps = {
  repoId: string;
};

export const RepoFreshnessButton = ({ repoId }: RepoFreshnessButtonProps) => {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  const checkFreshness = async () => {
    setIsChecking(true);

    const response = await fetch(
      `/api/repos/${repoId}/status?refreshFreshness=1`,
      { cache: "no-store" },
    );

    setIsChecking(false);

    if (response.ok) {
      router.refresh();
    }
  };

  return (
    <Button
      disabled={isChecking}
      onClick={checkFreshness}
      type="button"
      variant="outline"
    >
      <RefreshCw className={isChecking ? "animate-spin" : ""} />
      {isChecking ? "Checking" : "Check freshness"}
    </Button>
  );
};
