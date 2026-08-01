import {
  Bot,
  BrainCircuit,
  FileCode2,
  GitBranch,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type React from "react";

const workspaceSignals = [
  { icon: GitBranch, label: "GitHub repo intake" },
  { icon: FileCode2, label: "Line-level citations" },
  { icon: Bot, label: "Repo chat context" },
  { icon: ShieldCheck, label: "Owner-scoped workspaces" },
];

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="grid min-h-svh bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
      <section className="hidden border-r bg-muted/20 p-8 lg:flex lg:flex-col">
        <Link href="/" className="flex w-fit items-center gap-2 font-semibold">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BrainCircuit className="size-5" />
          </span>
          <span>RepoMind</span>
        </Link>

        <div className="my-auto max-w-xl space-y-8">
          <div className="space-y-4">
            <p className="font-medium text-primary text-sm">
              Premium AI developer workspace
            </p>
            <h2 className="text-balance font-semibold text-4xl tracking-normal">
              Turn unfamiliar repositories into guided, cited code context.
            </h2>
            <p className="max-w-lg text-muted-foreground text-sm leading-6">
              Sign in to keep repo reports, architecture diagrams, source files,
              and AI chat history connected to your account.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {workspaceSignals.map((signal) => {
              const Icon = signal.icon;
              return (
                <div
                  className="rounded-lg border bg-background/80 p-3 text-sm"
                  key={signal.label}
                >
                  <Icon className="mb-3 size-4 text-primary" />
                  {signal.label}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </section>
    </main>
  );
};

export default AuthLayout;
