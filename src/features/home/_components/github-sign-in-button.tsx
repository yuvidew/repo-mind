"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ComponentProps, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type GithubSignInButtonProps = ComponentProps<typeof Button>;

export const GithubSignInButton = ({
  children,
  disabled,
  ...props
}: GithubSignInButtonProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const onContinue = async () => {
    let handledError = false;
    setIsPending(true);

    try {
      await authClient.signIn.social(
        { provider: "github" },
        {
          onSuccess: () => {
            router.refresh();
          },
          onError: (ctx) => {
            handledError = true;
            toast.error(ctx.error.message);
          },
        },
      );
    } catch (error) {
      if (!handledError) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        );
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      type="button"
      disabled={disabled || isPending}
      onClick={onContinue}
      {...props}
    >
      {isPending ? <Loader2 className="animate-spin" /> : children}
    </Button>
  );
};
