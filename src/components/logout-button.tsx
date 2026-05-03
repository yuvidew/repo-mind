"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

export const LogoutButton = () => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const onLogout = async () => {
    let handledError = false;
    setIsPending(true);

    try {
      await authClient.signOut(undefined, {
        onSuccess: () => {
          toast.success("Signed out successfully");
          router.push("/sign-in");
          router.refresh();
        },
        onError: (ctx) => {
          handledError = true;
          toast.error(ctx.error.message);
        },
      });
    } catch (error) {
      if (!handledError) {
        const message =
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.";
        toast.error(message);
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onLogout}
      disabled={isPending}
    >
      {isPending ? <Spinner /> : <LogOut />}
      Log out
    </Button>
  );
};
