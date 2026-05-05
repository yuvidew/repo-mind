"use client";

import {
  BadgeCheck,
  CreditCard,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

type AccountMenuProps = {
  userEmail: string | null;
  userImage: string | null;
  userName: string | null;
};

export const AccountMenu = ({
  userEmail,
  userImage,
  userName,
}: AccountMenuProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const displayName = userName || userEmail || "User";
  const fallback = getInitial(displayName);

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Open account menu"
        >
          <Avatar>
            {userImage ? (
              <AvatarImage src={userImage} alt={displayName} />
            ) : null}
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-72 p-0">
        <div className="flex items-center gap-3 p-3">
          <Avatar size="lg">
            {userImage ? (
              <AvatarImage src={userImage} alt={displayName} />
            ) : null}
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">{displayName}</p>
            {userEmail ? (
              <p className="truncate text-muted-foreground text-xs">
                {userEmail}
              </p>
            ) : null}
          </div>
        </div>


        <DropdownMenuSeparator className="m-0" />

        <DropdownMenuItem
          className="h-11 gap-3 px-3"
          disabled={isPending}
          onSelect={(event) => {
            event.preventDefault();
            void onLogout();
          }}
        >
          {isPending ? (
            <Spinner />
          ) : (
            <LogOut className="text-muted-foreground" />
          )}
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "U";
}
