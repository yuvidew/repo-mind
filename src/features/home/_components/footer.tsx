import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="border-t bg-muted/20">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 text-muted-foreground text-sm sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>RepoMind turns repositories into readable project knowledge.</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/sign-in"
            className="transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <a
            href="#features"
            className="transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a href="#flow" className="transition-colors hover:text-foreground">
            Flow
          </a>
        </div>
      </div>
    </footer>
  );
};
