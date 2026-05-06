import type { RepositoryAnalysis } from "@/lib/analysis-types";
import { type DemoRepo, demoRepos } from "./repo-demo-data";

type DemoResult = {
  repo: DemoRepo | null;
  analysis: RepositoryAnalysis | null;
};

const readyAnalyses: Record<string, RepositoryAnalysis> = {
  "repo-nextjs": buildAnalysis("repo-nextjs", {
    stars: 130_400,
    sampledFiles: 74,
    analysisMode: "deep",
    summary:
      "Next.js is a full-stack React framework built around routing, rendering, bundling, caching, and deployment primitives for production web apps.",
    plainEnglish:
      "This repository is the source for Next.js. It combines React rendering, App Router conventions, development tooling, compiler integration, and server runtime code into one framework package.",
    techStack: ["TypeScript", "React", "Turbopack", "SWC", "Node.js", "Rust"],
    architecture:
      "The codebase is organized around packages that separate framework APIs, build tooling, server rendering, client runtime behavior, and compiler integrations. The App Router features sit alongside older routing support while shared packages keep build and runtime behavior consistent.",
    dataFlow:
      "A project request enters through the router, resolves route modules and server components, passes through cache and rendering layers, and returns HTML or React payloads. During development, file changes flow through Turbopack/SWC before the runtime refreshes the page.",
    keyFiles: [
      {
        path: "packages/next/src/server/next-server.ts",
        purpose: "Coordinates core server behavior and request handling.",
      },
      {
        path: "packages/next/src/build/index.ts",
        purpose: "Runs production build orchestration and output generation.",
      },
      {
        path: "packages/next/src/client/app-index.tsx",
        purpose: "Bootstraps the client-side App Router runtime.",
      },
      {
        path: "packages/next/src/shared/lib/router/utils",
        purpose:
          "Contains route matching and URL behavior shared across runtime layers.",
      },
    ],
    wikiSections: [
      {
        title: "Routing Model",
        content:
          "The repository supports file-system routing, dynamic segments, route handlers, layouts, and server component boundaries. The router translates project files into executable route modules.",
      },
      {
        title: "Rendering Pipeline",
        content:
          "Rendering moves through server component resolution, cache decisions, HTML streaming, and client hydration. Different paths handle static, dynamic, and incremental work.",
      },
      {
        title: "Build Tooling",
        content:
          "Build code connects TypeScript transforms, compiler output, bundling, optimization, and deployment artifacts. Turbopack and SWC provide the high-performance parts of this pipeline.",
      },
    ],
    diagram: {
      nodes: [
        { id: "app", label: "User App", detail: "Project files and routes" },
        { id: "router", label: "Router", detail: "Matches route modules" },
        {
          id: "server",
          label: "Server Runtime",
          detail: "Renders and streams",
        },
        { id: "compiler", label: "Compiler", detail: "SWC and bundling" },
        {
          id: "cache",
          label: "Cache Layer",
          detail: "Static and dynamic data",
        },
        {
          id: "client",
          label: "Client Runtime",
          detail: "Hydration and navigation",
        },
      ],
      edges: [
        { from: "app", to: "router" },
        { from: "router", to: "server" },
        { from: "app", to: "compiler" },
        { from: "server", to: "cache" },
        { from: "server", to: "client" },
      ],
    },
  }),
  "repo-shadcn-ui": buildAnalysis("repo-shadcn-ui", {
    stars: 91_200,
    sampledFiles: 48,
    summary:
      "shadcn/ui is a component registry and CLI-driven design system approach for copying accessible React components into applications.",
    plainEnglish:
      "This repository provides reusable component source, registry metadata, CLI tooling, and examples so teams can own their UI code instead of depending on a black-box package.",
    techStack: [
      "TypeScript",
      "React",
      "Tailwind CSS",
      "Radix UI",
      "Registry",
      "CLI",
    ],
    architecture:
      "The repository separates registry definitions, UI component examples, documentation, and command-line tooling. Components are authored as source templates and distributed through registry metadata.",
    dataFlow:
      "A user runs the CLI, selects components, reads registry metadata, fetches source templates, and writes component files into their application where Tailwind and local utilities style them.",
    keyFiles: [
      {
        path: "apps/www/registry",
        purpose: "Defines registry entries and component source.",
      },
      {
        path: "packages/cli",
        purpose: "Implements add/init commands and project detection.",
      },
      { path: "apps/www/app", purpose: "Hosts documentation and examples." },
      {
        path: "apps/www/components",
        purpose: "Contains site-specific UI and preview components.",
      },
    ],
    wikiSections: [
      {
        title: "Registry System",
        content:
          "Registry files describe each component, dependencies, imports, and files that the CLI can copy into an application.",
      },
      {
        title: "CLI Workflow",
        content:
          "The CLI detects project configuration, installs dependencies, resolves aliases, and writes selected components into the target project.",
      },
      {
        title: "Design Approach",
        content:
          "The project favors owned source code, accessible primitives, Tailwind tokens, and local customization over package-level abstraction.",
      },
    ],
    diagram: {
      nodes: [
        { id: "docs", label: "Docs App", detail: "Examples and registry UI" },
        { id: "registry", label: "Registry", detail: "Component metadata" },
        { id: "cli", label: "CLI", detail: "Adds components" },
        { id: "target", label: "User App", detail: "Receives source files" },
        { id: "ui", label: "Components", detail: "Radix and Tailwind" },
      ],
      edges: [
        { from: "docs", to: "registry" },
        { from: "cli", to: "registry" },
        { from: "registry", to: "target" },
        { from: "ui", to: "registry" },
      ],
    },
  }),
  "repo-chaosmonkey": buildAnalysis("repo-chaosmonkey", {
    stars: 15_300,
    sampledFiles: 31,
    summary:
      "Chaos Monkey is a resilience tool that intentionally terminates instances to verify production systems survive infrastructure failures.",
    plainEnglish:
      "This repository contains a service and command-line workflow for scheduling controlled instance termination, filtering eligible infrastructure, and integrating with deployment systems.",
    techStack: ["Go", "CLI", "Spinnaker", "MySQL", "Cron", "Cloud APIs"],
    architecture:
      "The application is centered around a scheduler, configuration model, cloud/deployment integrations, and termination engine. Operators define where and when disruptions are allowed.",
    dataFlow:
      "Configuration identifies enabled apps and schedules. The scheduler finds eligible instances, filters unsafe candidates, calls cloud APIs to terminate instances, and records activity for review.",
    keyFiles: [
      {
        path: "cmd/chaosmonkey",
        purpose: "CLI entry point for operating the tool.",
      },
      { path: "monkey", purpose: "Core scheduling and termination behavior." },
      {
        path: "config",
        purpose: "Configuration loading and environment setup.",
      },
      {
        path: "spinnaker",
        purpose: "Integration with deployment and application metadata.",
      },
    ],
    wikiSections: [
      {
        title: "Scheduling",
        content:
          "Schedules define the allowed windows for disruption and help ensure termination happens during controlled periods.",
      },
      {
        title: "Eligibility Filtering",
        content:
          "Before terminating anything, the system checks app configuration, instance health, deployment state, and opt-in rules.",
      },
      {
        title: "Termination Flow",
        content:
          "Eligible instances are selected, passed to the termination engine, removed through provider APIs, and logged for operational review.",
      },
    ],
    diagram: {
      nodes: [
        { id: "cli", label: "CLI", detail: "Operator commands" },
        { id: "config", label: "Config", detail: "Rules and schedules" },
        { id: "scheduler", label: "Scheduler", detail: "Finds run windows" },
        { id: "filter", label: "Eligibility", detail: "Filters instances" },
        {
          id: "terminator",
          label: "Terminator",
          detail: "Calls provider APIs",
        },
        { id: "logs", label: "Audit", detail: "Stores activity" },
      ],
      edges: [
        { from: "cli", to: "config" },
        { from: "config", to: "scheduler" },
        { from: "scheduler", to: "filter" },
        { from: "filter", to: "terminator" },
        { from: "terminator", to: "logs" },
      ],
    },
  }),
};

export function getDemoRepoResult(id: string): DemoResult {
  const repo = demoRepos.find((item) => item.id === id) ?? null;

  return {
    repo,
    analysis: readyAnalyses[id] ?? null,
  };
}

function buildAnalysis(
  repoId: string,
  data: Omit<
    RepositoryAnalysis,
    "repo" | "provenance" | "risks" | "beginnerGuide" | "debug" | "warnings"
  > & {
    sampledFiles: number;
    stars: number;
    analysisMode?: RepositoryAnalysis["repo"]["analysisMode"];
  },
): RepositoryAnalysis {
  const repo = demoRepos.find((item) => item.id === repoId);

  if (!repo) {
    throw new Error(`Unknown demo repo: ${repoId}`);
  }

  return {
    repo: {
      owner: repo.owner,
      name: repo.name,
      url: repo.url,
      defaultBranch: repo.branch,
      description: repo.description,
      stars: data.stars,
      language: repo.language,
      fileCount: repo.fileCount,
      sampledFiles: data.sampledFiles,
      analysisMode: data.analysisMode ?? "fast",
    },
    summary: data.summary,
    provenance: {
      generatedAt: "2026-05-03T00:00:00.000Z",
      analyzedCommitSha: repo.analyzedCommitSha ?? null,
      latestCommitSha: repo.latestCommitSha ?? repo.analyzedCommitSha ?? null,
      freshnessStatus: repo.freshnessStatus ?? "unknown",
      provider: "demo",
      model: "RepoMind demo report",
      promptVersion: "v1",
    },
    plainEnglish: data.plainEnglish,
    techStack: data.techStack,
    architecture: data.architecture,
    dataFlow: data.dataFlow,
    keyFiles: data.keyFiles,
    wikiSections: data.wikiSections,
    risks: [
      "Demo analysis is based on representative structure, not a live persisted scan.",
      "Large repositories may need deeper sampling before production use.",
      "Private repository access requires encrypted GitHub token storage.",
    ],
    beginnerGuide: [
      "Start with the README and package or command entry points.",
      "Read the key files listed below before moving into smaller modules.",
      "Use the diagram to understand the main flow, then inspect feature-specific folders.",
      "Compare risks and warnings with the actual code before making changes.",
    ],
    diagram: data.diagram,
    debug: {
      source: "ai",
      provider: "demo",
      model: "RepoMind demo report",
      selectedFiles: data.keyFiles.map((file) => file.path),
      detectedStack: data.techStack,
      treeTruncated: false,
    },
    warnings: [
      "This page is using demo analysis data until repo persistence is wired.",
    ],
  };
}
