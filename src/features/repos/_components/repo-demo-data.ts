export type RepoStatus = "READY" | "ANALYZING" | "FAILED";

export type DemoRepo = {
  id: string;
  owner: string;
  name: string;
  description: string;
  url: string;
  status: RepoStatus;
  visibility: "Public" | "Private";
  branch: string;
  language: string;
  fileCount: number;
  lastAnalyzedAt: string;
  progress?: number;
};

export const demoRepos: DemoRepo[] = [
  {
    id: "repo-nextjs",
    owner: "vercel",
    name: "next.js",
    description:
      "React framework with App Router, server components, and full-stack deployment patterns.",
    url: "https://github.com/vercel/next.js",
    status: "READY",
    visibility: "Public",
    branch: "canary",
    language: "TypeScript",
    fileCount: 8421,
    lastAnalyzedAt: "May 3, 2026",
  },
  {
    id: "repo-react",
    owner: "facebook",
    name: "react",
    description:
      "Core React library internals, reconciler packages, compiler work, and ecosystem tooling.",
    url: "https://github.com/facebook/react",
    status: "ANALYZING",
    visibility: "Public",
    branch: "main",
    language: "JavaScript",
    fileCount: 5296,
    lastAnalyzedAt: "In progress",
    progress: 68,
  },
  {
    id: "repo-shadcn-ui",
    owner: "shadcn-ui",
    name: "ui",
    description:
      "Composable component registry, CLI packages, examples, and design-system documentation.",
    url: "https://github.com/shadcn-ui/ui",
    status: "READY",
    visibility: "Public",
    branch: "main",
    language: "TypeScript",
    fileCount: 1732,
    lastAnalyzedAt: "May 2, 2026",
  },
  {
    id: "repo-prisma",
    owner: "prisma",
    name: "prisma",
    description:
      "Database toolkit repository covering schema, client generation, migrations, and engines.",
    url: "https://github.com/prisma/prisma",
    status: "FAILED",
    visibility: "Public",
    branch: "main",
    language: "TypeScript",
    fileCount: 6404,
    lastAnalyzedAt: "May 1, 2026",
  },
  {
    id: "repo-chaosmonkey",
    owner: "netflix",
    name: "chaosmonkey",
    description:
      "Resilience tool for controlled instance termination and infrastructure failure testing.",
    url: "https://github.com/netflix/chaosmonkey",
    status: "READY",
    visibility: "Public",
    branch: "master",
    language: "Go",
    fileCount: 312,
    lastAnalyzedAt: "Apr 30, 2026",
  },
  {
    id: "repo-internal-api",
    owner: "repomind-labs",
    name: "internal-api",
    description:
      "Private API workspace used for auth, repo ingestion experiments, and report persistence.",
    url: "https://github.com/repomind-labs/internal-api",
    status: "ANALYZING",
    visibility: "Private",
    branch: "main",
    language: "TypeScript",
    fileCount: 986,
    lastAnalyzedAt: "In progress",
    progress: 34,
  },
];
