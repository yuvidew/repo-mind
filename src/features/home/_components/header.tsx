import { BrainCircuit, GitBranch } from "lucide-react";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "./account-menu";
import { GithubSignInButton } from "./github-sign-in-button";

type HeaderProps = {
  isSignedIn: boolean;
  userEmail: string | null;
  userImage: string | null;
  userName: string | null;
};

export const Header = ({
  isSignedIn,
  userEmail,
  userImage,
  userName,
}: HeaderProps) => {
  const displayName = userName || userEmail;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 font-semibold"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BrainCircuit className="size-4" />
          </span>
          <span className="truncate">RepoMind</span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {isSignedIn ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/repos">Repositories</Link>
              </Button>
              <AccountMenu
                userEmail={userEmail}
                userImage={userImage}
                userName={displayName}
              />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <GithubSignInButton size="sm">
                <GitBranch />
                GitHub
              </GithubSignInButton>
            </>
          )}
          <ModeToggle />
        </div>
      </div>
    </header>
  );
};
