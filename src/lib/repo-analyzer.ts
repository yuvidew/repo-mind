import OpenAI from "openai";
import type {
  AnalysisDebug,
  AnalysisMode,
  DiagramEdge,
  DiagramNode,
  RepositoryAnalysis,
} from "@/lib/analysis-types";

type GitHubRepo = {
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
};

type GitHubTreeItem = {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
  url: string;
};

type GitHubTree = {
  tree: GitHubTreeItem[];
  truncated: boolean;
};

type SampledFile = {
  path: string;
  content: string;
};

type AnalysisOptions = {
  mode?: AnalysisMode;
  onProgress?: (progress: number) => Promise<void> | void;
};

type AnalysisLimits = {
  sampleFiles: number;
  totalChars: number;
  fileChars: number;
  treeEntries: number;
  outputTokens: number;
  aiTimeoutMs: number;
};

const ANALYSIS_LIMITS: Record<AnalysisMode, AnalysisLimits> = {
  fast: {
    sampleFiles: 72,
    totalChars: 190_000,
    fileChars: 5_000,
    treeEntries: 180,
    outputTokens: 1400,
    aiTimeoutMs: 20_000,
  },
  deep: {
    sampleFiles: 140,
    totalChars: 520_000,
    fileChars: 12_000,
    treeEntries: 1200,
    outputTokens: 4200,
    aiTimeoutMs: 85_000,
  },
};

const GITHUB_CACHE_SECONDS = 15 * 60;
const GITHUB_FETCH_TIMEOUT_MS = 8_000;
const RAW_FETCH_CONCURRENCY = 8;
const GITHUB_CACHE_OPTION: RequestCache =
  process.env.NODE_ENV === "development" ? "no-store" : "force-cache";
const GITHUB_NEXT_OPTIONS =
  process.env.NODE_ENV === "development"
    ? undefined
    : { revalidate: GITHUB_CACHE_SECONDS };

const SKIP_DIRS = new Set([
  ".git",
  ".next",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "vendor",
  "_generated",
]);

const SKIP_FILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  "bun.lock",
]);

const TEXT_EXTENSIONS = new Set([
  ".c",
  ".cpp",
  ".cs",
  ".css",
  ".go",
  ".graphql",
  ".html",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".md",
  ".mjs",
  ".php",
  ".prisma",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sh",
  ".sql",
  ".svelte",
  ".toml",
  ".ts",
  ".tsx",
  ".vue",
  ".yaml",
  ".yml",
]);

const IMPORTANT_NAMES = new Set([
  "readme.md",
  "package.json",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "prisma.config.ts",
  "drizzle.config.ts",
  "vite.config.js",
  "vite.config.ts",
  "tsconfig.json",
  "schema.prisma",
  "drizzle.config.ts",
  "dockerfile",
  "compose.yaml",
  "docker-compose.yml",
]);

const RUNTIME_FILE_PATTERNS = [
  "src/app/page.",
  "src/app/layout.",
  "src/pages/index.",
  "src/main.",
  "src/index.",
  "app/page.",
  "app/layout.",
  "pages/index.",
];

const API_FILE_PATTERNS = ["/api/", "route.ts", "route.js", "server", "trpc"];

const PROVIDER_FILE_PATTERNS = [
  "src/components/providers.",
  "src/app/providers.",
  "src/proxy.",
  "src/middleware.",
  "middleware.",
];

const BACKGROUND_JOB_PATTERNS = [
  "inngest/",
  "src/inngest/",
  "jobs/",
  "worker/",
];

const CONVEX_PATTERNS = [
  "convex/schema.",
  "convex/projects.",
  "convex/files.",
  "convex/conversations.",
  "convex/system.",
  "convex/auth.",
];

const FEATURE_FILE_PATTERNS = [
  "src/features/",
  "features/",
  "src/components/ai-elements/",
  "src/components/",
  "src/hooks/",
];

const DATA_FILE_PATTERNS = [
  "schema.prisma",
  "prisma/",
  "prisma.config",
  "drizzle",
  "src/lib/db",
  "lib/db",
  "db.",
  "database.",
  "db/",
  "database",
  "model",
  "repository",
  "postgres",
  "neon",
  "mongoose",
  "typeorm",
];

const FRAMEWORK_DOC_PATTERNS = [
  "contributing/",
  ".github/",
  ".cursor/",
  ".conductor/",
  ".devcontainer/",
  "docs/",
  "errors/",
];

const FRAMEWORK_CORE_PATTERNS = [
  "packages/next/src/build/",
  "packages/next/src/server/",
  "packages/next/src/client/",
  "packages/next/src/shared/",
  "packages/next/src/lib/",
  "packages/next/src/export/",
];

const RUST_BUILD_PATTERNS = [
  "crates/",
  "turbopack/",
  "swc/",
  "next-swc/",
  "turbo-tasks/",
  "napi/",
  ".rs",
];

const BENCHMARK_PATTERNS = ["bench", "benchmark", "benchmarks/"];

const TEST_SUITE_PATTERNS = [
  "test/e2e/",
  "test/development/",
  "test/production/",
  "test/integration/",
  "test/unit/",
  "test/lib/",
  "testing/",
];

const ECOSYSTEM_PATTERNS = [
  "packages/create-next-app/",
  "packages/eslint-plugin-next/",
  "packages/font/",
  "packages/next-codemod/",
  "examples/",
];

const ROOT_PRIORITY_FILES = [
  "README.md",
  "package.json",
  "pnpm-workspace.yaml",
  "taskfile.js",
  "next-runtime.webpack-config.js",
  "contributing/core/adding-features.md",
  "contributing/core/building.md",
  "contributing/core/developing.md",
  "contributing/core/developing-using-local-app.md",
  "contributing/core/testing.md",
  "contributing/core/vscode-debugger.md",
  "contributing/core/adding-error-links.md",
  "contributing/repository/linting.md",
  "contributing/repository/pull-request-descriptions.md",
  "contributing/repository/triaging.md",
  ".github/pull_request_template.md",
  ".cursor/commands/gt-workflow.md",
  ".conductor/README.md",
  ".conductor/scripts/setup.sh",
  ".conductor/scripts/run.sh",
  ".devcontainer/headless-browser/install.sh",
  ".devcontainer/node-extras/install.sh",
  ".devcontainer/rust/install.sh",
  "packages/next/package.json",
  "packages/next/src/build/index.ts",
  "packages/next/src/server/next.ts",
  "packages/next/src/shared/lib/router/router.ts",
  "packages/next/src/next-devtools/server/devtools-config-middleware.ts",
  "packages/create-next-app/package.json",
  "packages/eslint-plugin-next/package.json",
  "packages/next-codemod/package.json",
];

const FRAMEWORK_ROOT_EXACT_FILES = [
  "README.md",
  "package.json",
  "pnpm-workspace.yaml",
  "taskfile.js",
  "next-runtime.webpack-config.js",
];

const FRAMEWORK_CONTRIBUTION_EXACT_FILES = [
  "contributing/core/adding-features.md",
  "contributing/core/building.md",
  "contributing/core/developing.md",
  "contributing/core/developing-using-local-app.md",
  "contributing/core/testing.md",
  "contributing/core/vscode-debugger.md",
  "contributing/core/adding-error-links.md",
];

const FRAMEWORK_REPOSITORY_EXACT_FILES = [
  "contributing/repository/linting.md",
  "contributing/repository/pull-request-descriptions.md",
  "contributing/repository/triaging.md",
  ".github/pull_request_template.md",
  ".cursor/commands/gt-workflow.md",
];

const FRAMEWORK_ENVIRONMENT_EXACT_FILES = [
  ".conductor/README.md",
  ".conductor/scripts/setup.sh",
  ".conductor/scripts/run.sh",
  ".devcontainer/headless-browser/install.sh",
  ".devcontainer/node-extras/install.sh",
  ".devcontainer/rust/install.sh",
];

const FRAMEWORK_CORE_EXACT_FILES = [
  "packages/next/package.json",
  "packages/next/src/build/index.ts",
  "packages/next/src/server/next.ts",
  "packages/next/src/shared/lib/router/router.ts",
  "packages/next/src/next-devtools/server/devtools-config-middleware.ts",
];

const FRAMEWORK_ECOSYSTEM_EXACT_FILES = [
  "packages/create-next-app/package.json",
  "packages/eslint-plugin-next/package.json",
  "packages/next-codemod/package.json",
];

const CONFIG_FILE_NAMES = new Set([
  "package.json",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "vite.config.js",
  "vite.config.ts",
  "tsconfig.json",
]);

export async function analyzeRepository(
  repoUrl: string,
  options: AnalysisOptions = {},
): Promise<RepositoryAnalysis> {
  const mode = options.mode ?? "fast";
  const limits = ANALYSIS_LIMITS[mode];
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const githubHeaders = getGitHubHeaders();
  const metadata = await getJson<GitHubRepo>(
    `https://api.github.com/repos/${owner}/${repo}`,
    githubHeaders,
  );
  await options.onProgress?.(72);
  const tree = await getJson<GitHubTree>(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${metadata.default_branch}?recursive=1`,
    githubHeaders,
  );
  await options.onProgress?.(78);

  const candidates = selectFiles(tree.tree, limits.sampleFiles);
  const sampledFiles = await fetchSampledFiles({
    owner,
    repo,
    branch: metadata.default_branch,
    files: candidates,
    headers: githubHeaders,
    limits,
  });
  await options.onProgress?.(84);
  const warnings: string[] = [];

  if (tree.truncated) {
    warnings.push(
      "GitHub returned a truncated tree, so this is a partial analysis.",
    );
  }

  if (sampledFiles.length === 0) {
    warnings.push(
      "No readable source files were found in the sampled repository tree.",
    );
  }

  if (sampledFiles.length > 0 && sampledFiles.length < 8) {
    warnings.push(
      `Only ${sampledFiles.length} readable source files were sampled. This repository has limited analyzable code, so the report and chat answers may be less detailed than usual.`,
    );
  }

  const detectedStack = inferTechStack(metadata, sampledFiles);
  let analysisSource: AnalysisDebug["source"] = "ai";

  const aiResult =
    sampledFiles.length > 0
      ? await (async () => {
          await options.onProgress?.(90);

          return runDeepSeekAnalysis({
            metadata,
            tree,
            sampledFiles,
            limits,
            detectedStack,
          }).catch((error) => {
            analysisSource = "fallback";
            const message = error instanceof Error ? error.message : null;
            warnings.push(
              message?.includes("timed out")
                ? `${capitalize(mode)} mode used fallback output because the AI report timed out. Try Deep reanalyze for a fuller generated report.`
                : message
                  ? `AI report unavailable: ${message}`
                  : "AI report unavailable for an unknown reason.",
            );
            return null;
          });
        })()
      : null;

  if (!aiResult) {
    analysisSource = "fallback";
  }

  return normalizeAnalysis({
    aiResult,
    metadata,
    repoUrl,
    sampledFiles,
    totalFiles: tree.tree.filter((item) => item.type === "blob").length,
    mode,
    warnings,
    debug: {
      source: analysisSource,
      provider: "NVIDIA API",
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-ai/deepseek-v4-pro",
      selectedFiles: sampledFiles.map((file) => file.path),
      sampledFiles,
      detectedStack,
      treeTruncated: tree.truncated,
    },
  });
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function parseGitHubUrl(repoUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(repoUrl.trim());
  } catch {
    throw new Error("Enter a valid GitHub repository URL.");
  }

  if (
    parsed.hostname !== "github.com" &&
    parsed.hostname !== "www.github.com"
  ) {
    throw new Error(
      "Only github.com repository URLs are supported in the MVP analyzer.",
    );
  }

  const [owner, repoWithSuffix] = parsed.pathname.split("/").filter(Boolean);
  const repo = repoWithSuffix?.replace(/\.git$/, "");

  if (!owner || !repo) {
    throw new Error(
      "Use a full repository URL like https://github.com/owner/repo.",
    );
  }

  return { owner, repo };
}

function getGitHubHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "RepoMind MVP analyzer",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function getJson<T>(
  url: string,
  headers: Record<string, string>,
): Promise<T> {
  const response = await fetch(url, {
    headers,
    cache: GITHUB_CACHE_OPTION,
    ...(GITHUB_NEXT_OPTIONS ? { next: GITHUB_NEXT_OPTIONS } : {}),
    signal: AbortSignal.timeout(GITHUB_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `GitHub request failed (${response.status}): ${message.slice(0, 220)}`,
    );
  }

  return response.json() as Promise<T>;
}

function selectFiles(items: GitHubTreeItem[], sampleFiles: number) {
  const usefulFiles = items
    .filter((item) => item.type === "blob")
    .filter((item) => isUsefulTextFile(item.path, item.size ?? 0))
    .sort((first, second) => fileScore(second.path) - fileScore(first.path));

  if (looksLikeFrameworkMonorepo(usefulFiles)) {
    return selectFrameworkMonorepoFiles(usefulFiles, sampleFiles);
  }

  const selected: GitHubTreeItem[] = [];
  const preferredGroups: Array<{ patterns: string[]; take: number }> = [
    { patterns: ["readme.md"], take: 1 },
    { patterns: ["package.json"], take: 1 },
    {
      patterns: [
        "next.config",
        "vite.config",
        "tsconfig.json",
        "tailwind.config",
        "components.json",
      ],
      take: 5,
    },
    { patterns: PROVIDER_FILE_PATTERNS, take: 4 },
    { patterns: RUNTIME_FILE_PATTERNS, take: 6 },
    { patterns: API_FILE_PATTERNS, take: 12 },
    { patterns: CONVEX_PATTERNS, take: 10 },
    { patterns: BACKGROUND_JOB_PATTERNS, take: 8 },
    { patterns: DATA_FILE_PATTERNS, take: 8 },
    { patterns: FEATURE_FILE_PATTERNS, take: Math.max(10, sampleFiles / 3) },
    { patterns: ["lib/", "src/lib/", "hooks/", "src/hooks/"], take: 8 },
  ];

  for (const group of preferredGroups) {
    addMatches(selected, usefulFiles, group.patterns, group.take, sampleFiles);
    if (selected.length >= sampleFiles) return selected;
  }

  for (const file of usefulFiles) {
    if (!selected.includes(file)) selected.push(file);
    if (selected.length >= sampleFiles) break;
  }

  return selected;
}

function looksLikeFrameworkMonorepo(files: GitHubTreeItem[]) {
  const paths = files.map((file) => file.path.toLowerCase());
  const hasPackages = paths.some((path) => path.startsWith("packages/"));
  const hasContributionDocs = paths.some((path) =>
    path.startsWith("contributing/"),
  );
  const hasFrameworkCore = paths.some((path) =>
    path.startsWith("packages/next/src/"),
  );
  const hasRustCore = paths.some((path) => path.startsWith("crates/"));
  const hasTestMatrix = paths.some((path) => path.startsWith("test/e2e/"));

  return (
    (hasPackages && hasContributionDocs) ||
    (hasFrameworkCore && hasTestMatrix) ||
    (hasPackages && hasRustCore)
  );
}

function selectFrameworkMonorepoFiles(
  usefulFiles: GitHubTreeItem[],
  sampleFiles: number,
) {
  const selected: GitHubTreeItem[] = [];
  const frameworkGroups: Array<{ patterns: string[]; take: number }> = [
    { patterns: FRAMEWORK_CORE_PATTERNS, take: Math.ceil(sampleFiles * 0.14) },
    { patterns: RUST_BUILD_PATTERNS, take: Math.ceil(sampleFiles * 0.12) },
    { patterns: BENCHMARK_PATTERNS, take: Math.ceil(sampleFiles * 0.08) },
    { patterns: ECOSYSTEM_PATTERNS, take: Math.ceil(sampleFiles * 0.1) },
    { patterns: TEST_SUITE_PATTERNS, take: Math.ceil(sampleFiles * 0.12) },
    { patterns: FRAMEWORK_DOC_PATTERNS, take: Math.ceil(sampleFiles * 0.1) },
  ];

  addExactMatches(
    selected,
    usefulFiles,
    FRAMEWORK_ROOT_EXACT_FILES,
    sampleFiles,
    5,
  );
  addExactMatches(
    selected,
    usefulFiles,
    FRAMEWORK_CONTRIBUTION_EXACT_FILES,
    sampleFiles,
    7,
  );
  addExactMatches(
    selected,
    usefulFiles,
    FRAMEWORK_REPOSITORY_EXACT_FILES,
    sampleFiles,
    5,
  );
  addExactMatches(
    selected,
    usefulFiles,
    FRAMEWORK_ENVIRONMENT_EXACT_FILES,
    sampleFiles,
    5,
  );
  addExactMatches(
    selected,
    usefulFiles,
    FRAMEWORK_CORE_EXACT_FILES,
    sampleFiles,
    5,
  );
  addExactMatches(
    selected,
    usefulFiles,
    FRAMEWORK_ECOSYSTEM_EXACT_FILES,
    sampleFiles,
    3,
  );

  for (const group of frameworkGroups) {
    addMatches(selected, usefulFiles, group.patterns, group.take, sampleFiles);
    if (selected.length >= sampleFiles) return selected;
  }

  for (const file of usefulFiles) {
    if (!selected.includes(file)) selected.push(file);
    if (selected.length >= sampleFiles) break;
  }

  return selected;
}

function addExactMatches(
  selected: GitHubTreeItem[],
  files: GitHubTreeItem[],
  paths: string[],
  limit: number,
  take = paths.length,
) {
  for (const path of paths) {
    if (selected.length >= limit || take <= 0) return;
    const match = files.find(
      (file) => file.path.toLowerCase() === path.toLowerCase(),
    );
    if (match && !selected.includes(match)) {
      selected.push(match);
      take -= 1;
    }
  }
}

function addMatches(
  selected: GitHubTreeItem[],
  files: GitHubTreeItem[],
  patterns: string[],
  take: number,
  limit: number,
) {
  for (const file of files) {
    if (selected.length >= limit || take <= 0) return;
    if (selected.includes(file) || !pathMatches(file.path, patterns)) continue;

    selected.push(file);
    take -= 1;
  }
}

function pathMatches(path: string, patterns: string[]) {
  const lower = path.toLowerCase();
  return patterns.some((pattern) => lower.includes(pattern.toLowerCase()));
}

function isUsefulTextFile(path: string, size: number) {
  const parts = path.split("/");
  const fileName = parts.at(-1)?.toLowerCase() ?? "";
  const extension = getExtension(fileName);

  if (size > 300_000 || SKIP_FILES.has(fileName)) {
    return false;
  }

  if (parts.some((part) => SKIP_DIRS.has(part.toLowerCase()))) {
    return false;
  }

  return IMPORTANT_NAMES.has(fileName) || TEXT_EXTENSIONS.has(extension);
}

function fileScore(path: string) {
  const lower = path.toLowerCase();
  const depth = lower.split("/").length;
  let score = 0;

  if (ROOT_PRIORITY_FILES.some((file) => file.toLowerCase() === lower)) {
    score += 160;
  }
  if (IMPORTANT_NAMES.has(lower.split("/").at(-1) ?? "")) score += 100;
  if (lower.startsWith("contributing/")) score += 75;
  if (lower.startsWith("packages/next/src/")) score += 68;
  if (lower.startsWith("crates/")) score += 62;
  if (pathMatches(lower, TEST_SUITE_PATTERNS)) score += 46;
  if (pathMatches(lower, BENCHMARK_PATTERNS)) score += 42;
  if (pathMatches(lower, ECOSYSTEM_PATTERNS)) score += 36;
  if (pathMatches(lower, CONVEX_PATTERNS)) score += 80;
  if (pathMatches(lower, BACKGROUND_JOB_PATTERNS)) score += 65;
  if (pathMatches(lower, PROVIDER_FILE_PATTERNS)) score += 60;
  if (lower.includes("src/")) score += 30;
  if (lower.includes("app/") || lower.includes("pages/")) score += 20;
  if (lower.includes("server") || lower.includes("api")) score += 16;
  if (lower.includes("features/")) score += 14;
  if (lower.includes("schema")) score += 12;
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) score += 10;
  if (lower.endsWith(".md")) score += 8;
  if (lower.includes("/compiled/") || lower.includes("/fixtures/")) score -= 80;
  score -= depth * 2;

  return score;
}

function getExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index === -1 ? "" : fileName.slice(index);
}

async function fetchSampledFiles(input: {
  owner: string;
  repo: string;
  branch: string;
  files: GitHubTreeItem[];
  headers: Record<string, string>;
  limits: AnalysisLimits;
}) {
  const results: SampledFile[] = [];
  let totalChars = 0;

  for (
    let index = 0;
    index < input.files.length;
    index += RAW_FETCH_CONCURRENCY
  ) {
    if (totalChars >= input.limits.totalChars) break;

    const batch = input.files.slice(index, index + RAW_FETCH_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((file) => fetchRawFile({ ...input, file }).catch(() => null)),
    );

    for (const file of batchResults) {
      if (!file || totalChars >= input.limits.totalChars) continue;

      const remainingChars = input.limits.totalChars - totalChars;
      const content = file.content.slice(0, remainingChars);
      totalChars += content.length;
      results.push({ path: file.path, content });
    }
  }

  return results;
}

async function fetchRawFile(input: {
  owner: string;
  repo: string;
  branch: string;
  headers: Record<string, string>;
  limits: AnalysisLimits;
  file: GitHubTreeItem;
}): Promise<SampledFile | null> {
  const rawUrl = `https://raw.githubusercontent.com/${input.owner}/${input.repo}/${encodePath(input.branch)}/${encodePath(input.file.path)}`;
  const response = await fetch(rawUrl, {
    headers: input.headers,
    cache: GITHUB_CACHE_OPTION,
    ...(GITHUB_NEXT_OPTIONS ? { next: GITHUB_NEXT_OPTIONS } : {}),
    signal: AbortSignal.timeout(GITHUB_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) return null;

  const content = (await response.text()).slice(0, input.limits.fileChars);
  return { path: input.file.path, content };
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function runDeepSeekAnalysis(input: {
  metadata: GitHubRepo;
  tree: GitHubTree;
  sampledFiles: SampledFile[];
  limits: AnalysisLimits;
  detectedStack: string[];
}) {
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "AI analysis is not configured yet. Ask the project owner to enable it.",
    );
  }

  const openai = new OpenAI({
    apiKey,
    baseURL:
      process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
  });
  const abortController = new AbortController();
  const timeout = setTimeout(
    () => abortController.abort(),
    input.limits.aiTimeoutMs,
  );

  try {
    const completion = await openai.chat.completions.create(
      {
        model: process.env.DEEPSEEK_MODEL ?? "deepseek-ai/deepseek-v4-pro",
        messages: [
          {
            role: "system",
            content:
              "You are a senior software architect explaining real GitHub repositories to beginner developers. Use only the repository tree and sampled source files provided. Be concrete and name actual folders, files, frameworks, APIs, data stores, and background jobs when visible. Return strict compact JSON only. Do not wrap the response in markdown.",
          },
          {
            role: "user",
            content: buildPrompt(input),
          },
        ],
        temperature: 0.3,
        top_p: 0.8,
        max_tokens: input.limits.outputTokens,
      },
      { signal: abortController.signal },
    );

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("DeepSeek returned an empty response.");
    }

    return parseJsonObject(content);
  } catch (error) {
    if (abortController.signal.aborted) {
      throw new Error(
        "AI report timed out. Try Deep mode if you need the full generated explanation.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildPrompt(input: {
  metadata: GitHubRepo;
  tree: GitHubTree;
  sampledFiles: SampledFile[];
  limits: AnalysisLimits;
  detectedStack: string[];
}) {
  const fileTree = input.tree.tree
    .slice(0, input.limits.treeEntries)
    .map((item) => `${item.type === "tree" ? "dir " : "file"} ${item.path}`)
    .join("\n");

  const files = input.sampledFiles
    .map((file) => `--- FILE: ${file.path}\n${file.content}`)
    .join("\n\n");

  const selectedFiles = input.sampledFiles
    .map((file) => `- ${file.path}`)
    .join("\n");

  const detectedStack =
    input.detectedStack.length > 0
      ? input.detectedStack.join(", ")
      : "unknown from static scan";

  return `Analyze this GitHub repository and return a detailed but beginner-friendly project report.

Important rules:
- Do not give a generic software-project explanation.
- Base the answer on actual files, folders, dependencies, route handlers, database schemas, jobs, and feature modules below.
- If something is not visible in the sampled files, say that it is not visible instead of inventing it.
- Prefer plain English, but include concrete filenames so the user can verify the explanation.
- The diagram must describe the application's runtime/code flow, not your analysis process.

Repository metadata:
- name: ${input.metadata.full_name}
- description: ${input.metadata.description ?? "none"}
- primary language: ${input.metadata.language ?? "unknown"}
- default branch: ${input.metadata.default_branch}
- detected stack from static scan: ${detectedStack}
- selected files sent to you:
${selectedFiles}

Return JSON with exactly this shape:
{
  "summary": "one short paragraph",
  "plainEnglish": "plain-English explanation of the product and who uses it",
  "techStack": ["framework/library/tool"],
  "architecture": "Step 1: ... Step 2: ... Step 3: ... Explain frontend, backend/API, data layer, jobs, AI/editor systems, and integrations when visible.",
  "dataFlow": "Step 1: ... Step 2: ... Step 3: ... Trace one realistic user action through UI, API/server, database/jobs/AI, and back to UI.",
  "keyFiles": [{ "path": "file path", "purpose": "what this file does in the code flow" }],
  "wikiSections": [{ "title": "section title", "content": "plain-English documentation section with concrete file/folder evidence" }],
  "risks": ["specific risk, missing piece, or uncertainty from the sampled code"],
  "beginnerGuide": ["Step 1: read file path because reason"],
  "diagram": {
    "nodes": [{ "id": "short-id", "label": "human label", "detail": "actual file/folder/service evidence" }],
    "edges": [{ "from": "source-id", "to": "target-id", "label": "relationship" }]
  }
}

Diagram rules:
- Use 5 to 8 nodes for complex repos, 3 to 5 for small repos.
- Node ids must be lowercase slugs without spaces.
- Edges must reference existing node ids.
- Prefer actual folders, API boundaries, data stores, and AI services when visible.
- Show code flow, not report-generation flow.
- Keep every string concise.

Key file rules:
- Include 8 to 14 files when possible.
- Prioritize entry points, providers/middleware, API routes, database/schema files, job files, AI files, and main feature modules.

Wiki section rules:
- Include 7 to 12 sections.
- First identify whether this is an application, framework/library, tooling monorepo, package, or infrastructure repo.
- For applications, use section titles a beginner would expect, such as Introduction, App Entry, Authentication, Data Model, API Routes, Background Jobs, AI Features, Editor System, Preview Runtime, GitHub Import/Export, Configuration, and Reading Path.
- For frameworks or large monorepos, use section titles like Contribution Guidelines, Core Development Workflow, Testing and Debugging, Repository Management, Development Environment, Core Build System, Compiler Engine, Benchmarking, Ecosystem Utilities, Error Handling, and Comprehensive Testing Suite.
- Each section must be plain English and explain what that layer does, why it exists, and which files show it.
- Do not invent sections that are not supported by the selected files or repository tree.

Repository tree sample:
${fileTree}

Sampled source files:
${files}`;
}

function parseJsonObject(content: string) {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("DeepSeek response was not JSON.");
  }

  return JSON.parse(
    cleaned.slice(start, end + 1),
  ) as Partial<RepositoryAnalysis>;
}

function normalizeAnalysis(input: {
  aiResult: Partial<RepositoryAnalysis> | null;
  metadata: GitHubRepo;
  repoUrl: string;
  sampledFiles: SampledFile[];
  totalFiles: number;
  mode: AnalysisMode;
  warnings: string[];
  debug: AnalysisDebug;
}): RepositoryAnalysis {
  const fallback = buildFallbackAnalysis(input.metadata, input.sampledFiles);
  const result = input.aiResult ?? fallback;
  const nodes = normalizeNodes(result.diagram?.nodes, fallback.diagram.nodes);
  const edges = normalizeEdges(
    result.diagram?.edges,
    nodes,
    fallback.diagram.edges,
  );

  return {
    repo: {
      owner: input.metadata.full_name.split("/")[0] ?? "",
      name: input.metadata.name,
      url: input.metadata.html_url || input.repoUrl,
      defaultBranch: input.metadata.default_branch,
      description: input.metadata.description,
      stars: input.metadata.stargazers_count,
      language: input.metadata.language,
      fileCount: input.totalFiles,
      sampledFiles: input.sampledFiles.length,
      analysisMode: input.mode,
    },
    summary: asText(result.summary, fallback.summary),
    plainEnglish: asText(result.plainEnglish, fallback.plainEnglish),
    techStack: asStringArray(result.techStack, fallback.techStack),
    architecture: asText(result.architecture, fallback.architecture),
    dataFlow: asText(result.dataFlow, fallback.dataFlow),
    keyFiles:
      Array.isArray(result.keyFiles) && result.keyFiles.length > 0
        ? result.keyFiles
        : fallback.keyFiles,
    wikiSections: normalizeWikiSections(
      result.wikiSections,
      fallback.wikiSections,
    ),
    risks: asStringArray(result.risks, fallback.risks),
    beginnerGuide: asStringArray(result.beginnerGuide, fallback.beginnerGuide),
    diagram: { nodes, edges },
    debug: input.debug,
    warnings: input.warnings,
  };
}

function buildFallbackAnalysis(
  metadata: GitHubRepo,
  files: SampledFile[],
): RepositoryAnalysis {
  const keyFiles = orderFilesForReading(files)
    .slice(0, 12)
    .map((file) => ({
      path: file.path,
      purpose: describeFilePurpose(file),
    }));
  const diagram = buildCodeFlowDiagram(files, metadata);
  const beginnerGuide = buildStepByStepGuide(files);
  const stack = inferTechStack(metadata, files);
  const readmeSummary = extractReadmeSummary(files);
  const appKind = inferAppKind(metadata, files, stack);

  return {
    repo: {
      owner: metadata.full_name.split("/")[0] ?? "",
      name: metadata.name,
      url: metadata.html_url,
      defaultBranch: metadata.default_branch,
      description: metadata.description,
      stars: metadata.stargazers_count,
      language: metadata.language,
      fileCount: files.length,
      sampledFiles: files.length,
      analysisMode: "fast",
    },
    summary:
      readmeSummary.summary ??
      metadata.description ??
      (stack.length > 0
        ? `${metadata.full_name} is a ${appKind} built with ${stack.slice(0, 6).join(", ")}.`
        : `${metadata.full_name} is a ${appKind}. RepoMind could not identify a framework or language from readable sampled source files.`),
    plainEnglish: buildPlainEnglishFallback(
      metadata,
      files,
      stack,
      readmeSummary,
    ),
    techStack: stack,
    architecture: buildArchitectureFallback(files, stack),
    dataFlow: buildDataFlowFallback(files, stack),
    keyFiles,
    wikiSections: buildWikiSections(metadata, files, stack, readmeSummary),
    risks: [
      "This quick explanation is based on sampled files, so use Deep mode or configure AI for a fuller repository-wide review.",
    ],
    beginnerGuide,
    diagram,
    debug: {
      source: "fallback",
      provider: "local fallback",
      model: null,
      selectedFiles: files.map((file) => file.path),
      detectedStack: stack,
      treeTruncated: false,
    },
    warnings: [],
  };
}

function buildWikiSections(
  metadata: GitHubRepo,
  files: SampledFile[],
  stack: string[],
  readmeSummary: ReturnType<typeof extractReadmeSummary>,
) {
  if (isFrameworkMonorepoSample(files)) {
    return buildFrameworkWikiSections(metadata, files, stack, readmeSummary);
  }

  const sections = [
    {
      title: `Introduction to ${metadata.name}`,
      content: buildPlainEnglishFallback(metadata, files, stack, readmeSummary),
    },
    {
      title: "Technology Stack",
      content: `This repository uses ${stack.join(", ") || "the technologies visible in the sampled files"}. The strongest evidence comes from ${listExistingPaths(files, ["package.json", "next.config", "tsconfig"])}. These files show the framework, runtime dependencies, scripts, and TypeScript setup that shape how the project is built and run.`,
    },
    sectionFromFile(
      "Application Entry and Providers",
      files,
      [...RUNTIME_FILE_PATTERNS, ...PROVIDER_FILE_PATTERNS],
      "The user-facing app starts from the App Router entry files and is wrapped by shared providers or middleware. These files explain what renders first, how global layout is applied, and where auth, data clients, theme, or other app-wide context enters the tree.",
    ),
    sectionFromFile(
      "API Routes and Server Actions",
      files,
      API_FILE_PATTERNS,
      "Server routes receive browser requests and connect the UI to backend work. In this project, the sampled API files show where messages, AI actions, GitHub import/export, or other server operations are triggered.",
    ),
    sectionFromFile(
      "Data Model and Persistence",
      files,
      [...CONVEX_PATTERNS, ...DATA_FILE_PATTERNS],
      "The data layer stores projects, files, messages, users, or other durable app state. These files are the best place to understand the nouns of the app and the relationships between them.",
    ),
    sectionFromFile(
      "Background Jobs",
      files,
      BACKGROUND_JOB_PATTERNS,
      "Background job files handle work that should not block the UI, such as imports, exports, message processing, or longer-running AI workflows. They usually sit between API routes and external services.",
    ),
    sectionFromFile(
      "Feature Modules",
      files,
      FEATURE_FILE_PATTERNS,
      "Feature folders organize the product by user-facing capability. They usually contain components, hooks, state, and helper code for specific areas such as projects, conversations, editor, or preview.",
    ),
    {
      title: "Architecture Walkthrough",
      content: buildArchitectureFallback(files, stack),
    },
    {
      title: "How Data and Requests Move",
      content: buildDataFlowFallback(files, stack),
    },
    {
      title: "Important Files and Folders",
      content: files
        .slice(0, 10)
        .map((file) => `${file.path}: ${describeFilePurpose(file)}`)
        .join(" "),
    },
    {
      title: "Recommended Reading Path",
      content: buildStepByStepGuide(files).join(" "),
    },
  ].filter((section) => section.content.trim().length > 0);

  return dedupeSections(sections).slice(0, 12);
}

function isFrameworkMonorepoSample(files: SampledFile[]) {
  return (
    files.some((file) => file.path.startsWith("contributing/")) ||
    files.some((file) => file.path.startsWith("packages/next/src/")) ||
    files.some((file) => file.path.startsWith("crates/"))
  );
}

function buildFrameworkWikiSections(
  metadata: GitHubRepo,
  files: SampledFile[],
  stack: string[],
  readmeSummary: ReturnType<typeof extractReadmeSummary>,
) {
  const sections = [
    {
      title: "Contribution Guidelines",
      content: `${metadata.full_name} is best understood as a framework monorepo rather than a single application. ${buildPlainEnglishFallback(metadata, files, stack, readmeSummary)} The contribution documentation explains how code changes are proposed, built, tested, debugged, and reviewed before they reach the main development branch.`,
    },
    sectionFromFile(
      "Core Contribution Workflow and Development Setup",
      files,
      [
        "contributing/core/adding-features.md",
        "contributing/core/building.md",
        "contributing/core/developing.md",
        "contributing/core/developing-using-local-app.md",
        "taskfile.js",
      ],
      "Core contributors start with the documented proposal and local-development workflow, then build the framework packages before testing changes against real applications. These files explain feature proposals, package builds, local linking, and commands used while working on the framework.",
    ),
    sectionFromFile(
      "Testing and Debugging Strategies",
      files,
      [
        "contributing/core/testing.md",
        "contributing/core/vscode-debugger.md",
        "test/e2e/",
        "test/development/",
        "test/production/",
        "test/integration/",
        "test/unit/",
      ],
      "The repository uses multiple test layers so framework behavior can be checked in development, production, integration, end-to-end, and unit-test contexts. Debugging documentation and test utilities help contributors inspect server behavior, browser traces, and failed temporary test apps.",
    ),
    sectionFromFile(
      "Repository Management and Quality Control",
      files,
      [
        "contributing/repository/linting.md",
        "contributing/repository/pull-request-descriptions.md",
        "contributing/repository/triaging.md",
        ".github/pull_request_template.md",
      ],
      "Repository-level documentation describes how maintainers keep changes reviewable and consistent. It covers linting, formatting, pull request descriptions, issue triage, and labels used to guide contributors.",
    ),
    sectionFromFile(
      "Standardized Git Workflow with Graphite",
      files,
      [".cursor/commands/gt-workflow.md"],
      "The project documents a Graphite-based workflow for stacked branches, commit modification, syncing, and pull request submission. This keeps large framework changes organized when multiple dependent branches are being reviewed.",
    ),
    sectionFromFile(
      "Development Container and System Dependencies",
      files,
      [
        ".devcontainer/",
        ".conductor/README.md",
        ".conductor/scripts/setup.sh",
        ".conductor/scripts/run.sh",
      ],
      "The development environment setup files install the tools needed for repeatable local and automated work. They cover package-manager setup, browser dependencies for Playwright and Chromium, Rust tooling, and isolated worktree execution.",
    ),
    sectionFromFile(
      "Next.js Core Build System",
      files,
      [
        "packages/next/src/build/",
        "packages/next/src/server/",
        "next-runtime.webpack-config.js",
        "packages/next/package.json",
        "crates/",
      ],
      "The core framework build system turns source code and user applications into optimized runtime output. The sampled files show the package entry points, build pipeline, server runtime, bundling configuration, and Rust-backed compiler infrastructure that support Next.js.",
    ),
    sectionFromFile(
      "Rust Build and Compile Engine",
      files,
      RUST_BUILD_PATTERNS,
      "Rust-based packages power performance-sensitive compiler and bundler work. These files are where SWC, Turbopack, TurboTasks, native bindings, or related compilation infrastructure usually live.",
    ),
    sectionFromFile(
      "Performance Benchmarking and Analysis",
      files,
      BENCHMARK_PATTERNS,
      "Benchmark files measure how framework changes affect build speed, server behavior, module loading, cache behavior, and runtime performance. This layer helps maintainers catch regressions before a change ships.",
    ),
    sectionFromFile(
      "Next.js Ecosystem and Utilities",
      files,
      ECOSYSTEM_PATTERNS,
      "The monorepo includes tools around the core framework, such as app scaffolding, linting plugins, codemods, font utilities, and examples. These packages help developers adopt and upgrade Next.js in real projects.",
    ),
    sectionFromFile(
      "Error Handling and Configuration Testing",
      files,
      ["errors/", "contributing/core/adding-error-links.md", "test/"],
      "Error documentation and configuration tests make failure modes easier to understand. This area connects concise runtime errors with longer explanations, examples, and tests for invalid settings.",
    ),
    sectionFromFile(
      "Comprehensive Testing Suite",
      files,
      TEST_SUITE_PATTERNS,
      "The test folders act as a safety net for framework behavior across many application shapes and runtime modes. They are the best map for seeing which features Next.js promises to keep stable.",
    ),
  ].filter((section) => section.content.trim().length > 0);

  return dedupeSections(sections).slice(0, 12);
}

function sectionFromFile(
  title: string,
  files: SampledFile[],
  patterns: string[],
  fallbackContent: string,
) {
  const matches = files.filter((file) => pathMatches(file.path, patterns));

  if (matches.length === 0) {
    return { title, content: "" };
  }

  const paths = matches
    .slice(0, 6)
    .map((file) => file.path)
    .join(", ");

  return {
    title,
    content: `${fallbackContent} Evidence in this repo: ${paths}.`,
  };
}

function listExistingPaths(files: SampledFile[], patterns: string[]) {
  const paths = files
    .filter((file) => pathMatches(file.path, patterns))
    .slice(0, 4)
    .map((file) => file.path);

  return paths.length > 0
    ? paths.join(", ")
    : "the selected configuration files";
}

function dedupeSections<T extends { title: string }>(sections: T[]) {
  const seen = new Set<string>();
  return sections.filter((section) => {
    const key = section.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildPlainEnglishFallback(
  metadata: GitHubRepo,
  files: SampledFile[],
  stack: string[],
  readmeSummary: ReturnType<typeof extractReadmeSummary>,
) {
  const stackText = stack.slice(0, 8).join(", ");
  const stackSentence = stackText
    ? `It uses ${stackText}.`
    : "RepoMind could not identify a framework or language from readable sampled source files.";
  const entryFile = findFirstFile(files, RUNTIME_FILE_PATTERNS)?.path;
  const readmeText =
    readmeSummary.details.length > 0
      ? ` The README highlights: ${readmeSummary.details.slice(0, 4).join("; ")}.`
      : "";

  if (entryFile) {
    return `${metadata.full_name} appears to be ${inferAppKind(metadata, files, stack)}. ${stackSentence} Start at ${entryFile}, then follow the providers, API routes, data files, and feature modules listed below to understand how the app works.${readmeText}`;
  }

  if (files.length === 0) {
    return `${metadata.full_name} appears to be ${inferAppKind(metadata, files, stack)}. ${stackSentence} This repository has little or no readable source in the sampled tree, so the report is intentionally high level.${readmeText}`;
  }

  return `${metadata.full_name} appears to be ${inferAppKind(metadata, files, stack)}. ${stackSentence} The analyzer found the most useful sampled files and built a reading order so a beginner can follow the code without guessing where to start.${readmeText}`;
}

function extractReadmeSummary(files: SampledFile[]) {
  const readme = files.find((file) => file.path.toLowerCase() === "readme.md");

  if (!readme) return { summary: null, details: [] };

  const lines = readme.content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const heading =
    lines.find((line) => line.startsWith("# "))?.replace(/^#\s+/, "") ?? null;
  const details = lines
    .filter((line) => line.startsWith("-") || line.startsWith("**"))
    .map((line) => line.replace(/^[-*\s]+/, "").replace(/\*\*/g, ""))
    .filter((line) => !line.toLowerCase().includes("sponsor"))
    .slice(0, 6);

  return {
    summary: heading ? `${heading}.` : null,
    details,
  };
}

function inferAppKind(
  metadata: GitHubRepo,
  files: SampledFile[],
  stack: string[],
) {
  if (isFrameworkMonorepoSample(files)) {
    return "a framework and tooling monorepo";
  }

  const allText = files
    .slice(0, 12)
    .map((file) => `${file.path}\n${file.content.slice(0, 1500)}`)
    .join("\n")
    .toLowerCase();

  if (allText.includes("cursor") || allText.includes("browser-based ide")) {
    return "a browser-based AI coding workspace or IDE";
  }
  if (stack.includes("Next.js") && stack.includes("Convex")) {
    return "a real-time Next.js application";
  }
  if (stack.includes("Next.js")) return "a Next.js web application";
  if (metadata.language) return `a ${metadata.language} project`;

  return "a software project";
}

function buildArchitectureFallback(files: SampledFile[], stack: string[]) {
  const layers = inferLayers(files);

  if (layers.length === 0) {
    return "Step 1: Start with the project configuration. Step 2: Open the main source files. Step 3: Follow imports into features, API routes, and data access code.";
  }

  const stackNote =
    stack.length > 0
      ? `Detected stack: ${stack.slice(0, 10).join(", ")}. `
      : "";

  return `${stackNote}${layers
    .map(
      (layer, index) =>
        `Step ${index + 1}: ${layer.label} - ${layer.description}${
          layer.file ? ` Evidence: ${layer.file.path}.` : ""
        }`,
    )
    .join(" ")}`;
}

function buildDataFlowFallback(files: SampledFile[], stack: string[]) {
  if (isFrameworkMonorepoSample(files)) {
    const core = findFirstFile(files, FRAMEWORK_CORE_PATTERNS);
    const rust = findFirstFile(files, RUST_BUILD_PATTERNS);
    const tests = findFirstFile(files, TEST_SUITE_PATTERNS);
    const docs = findFirstFile(files, FRAMEWORK_DOC_PATTERNS);
    const ecosystem = findFirstFile(files, ECOSYSTEM_PATTERNS);

    return [
      docs
        ? `Step 1: Contributors start from documentation such as ${docs.path} to understand the workflow and expectations.`
        : "Step 1: Contributors start from repository documentation and setup files.",
      core
        ? `Step 2: Framework behavior is implemented in core package files such as ${core.path}.`
        : "Step 2: Framework behavior is implemented in package source folders.",
      rust
        ? `Step 3: Performance-sensitive compilation and bundling work flows through Rust-backed code such as ${rust.path}.`
        : "Step 3: Build and compiler work flows through the framework's compiler and bundler layers.",
      tests
        ? `Step 4: Changes are validated through test suites such as ${tests.path}.`
        : "Step 4: Changes are validated by development, production, integration, and unit tests.",
      ecosystem
        ? `Step 5: Ecosystem packages and examples such as ${ecosystem.path} prove the framework works for real users.`
        : "Step 5: Ecosystem packages, examples, and utilities show how the framework is consumed.",
    ].join(" ");
  }

  const entry = findFirstFile(files, RUNTIME_FILE_PATTERNS);
  const provider = findFirstFile(files, PROVIDER_FILE_PATTERNS);
  const api = findFirstFile(files, API_FILE_PATTERNS);
  const data = findFirstFile(files, [
    ...DATA_FILE_PATTERNS,
    ...CONVEX_PATTERNS,
  ]);
  const job = findFirstFile(files, BACKGROUND_JOB_PATTERNS);
  const feature = findFirstFile(files, FEATURE_FILE_PATTERNS);
  const config = findConfigFile(files);
  const steps = [
    entry
      ? `Step 1: User opens the UI rendered from ${entry.path}.`
      : "Step 1: User enters through the main app or page file.",
    provider
      ? `Step 2: Shared providers, auth, theme, or middleware wrap the app in ${provider.path}.`
      : null,
    api
      ? `Step 3: UI actions call server/API logic in ${api.path}.`
      : `Step 3: UI actions move into feature modules${
          feature ? ` such as ${feature.path}` : ""
        }, hooks, or route handlers.`,
    data
      ? `Step 4: Server logic reads or writes app state through ${data.path}.`
      : "Step 4: Business logic reads configuration, files, or external services.",
    job
      ? `Step 5: Longer-running work is handed to background/job code in ${job.path}.`
      : null,
    config
      ? `Step ${job ? 6 : 5}: Runtime behavior is shaped by ${config.path}.`
      : `Step ${job ? 6 : 5}: The response flows back to the UI for rendering.`,
  ].filter((step): step is string => Boolean(step));

  if (stack.includes("AI SDK") || stack.includes("AI chat")) {
    steps.push(
      "Step 7: AI-related features use the configured model/provider to generate suggestions, edits, or conversation responses when those routes are called.",
    );
  }

  return steps.join(" ");
}

function buildStepByStepGuide(files: SampledFile[]) {
  const orderedFiles = orderFilesForReading(files).slice(0, 8);

  if (orderedFiles.length === 0) {
    return [
      "Step 1: Open the README or project config to identify the framework.",
      "Step 2: Find the main page or entry file to see what the user sees first.",
      "Step 3: Follow imports from the page into components, API routes, and data code.",
    ];
  }

  return orderedFiles.map(
    (file, index) =>
      `Step ${index + 1}: Read ${file.path} - ${describeFilePurpose(file)}`,
  );
}

function buildCodeFlowDiagram(
  files: SampledFile[],
  metadata: GitHubRepo,
): RepositoryAnalysis["diagram"] {
  const layers = inferLayers(files);
  const nodes =
    layers.length > 0
      ? layers.map((layer) => ({
          id: layer.id,
          label: layer.label,
          detail: layer.file?.path ?? layer.description,
        }))
      : [
          { id: "repo", label: "Repository", detail: metadata.full_name },
          {
            id: "files",
            label: "Sampled Files",
            detail: `${files.length} files`,
          },
          { id: "reader", label: "Reader", detail: "Step-by-step walkthrough" },
        ];

  if (isFrameworkMonorepoSample(files)) {
    return { nodes, edges: buildFrameworkDiagramEdges(nodes) };
  }

  const edges = nodes.slice(0, -1).map((node, index) => ({
    from: node.id,
    to: nodes[index + 1]?.id ?? node.id,
    label: flowLabelFor(nodes[index + 1]?.id ?? ""),
  }));

  return { nodes, edges };
}

function buildFrameworkDiagramEdges(nodes: DiagramNode[]) {
  const ids = new Set(nodes.map((node) => node.id));
  const candidates: DiagramEdge[] = [
    {
      from: "contribution-guides",
      to: "development-environment",
      label: "sets up work",
    },
    {
      from: "development-environment",
      to: "core-framework",
      label: "builds locally",
    },
    {
      from: "core-framework",
      to: "compile-engine",
      label: "uses compiler",
    },
    {
      from: "compile-engine",
      to: "benchmarks",
      label: "measured by",
    },
    {
      from: "compile-engine",
      to: "test-suite",
      label: "checked by",
    },
    {
      from: "core-framework",
      to: "ecosystem",
      label: "powers tools",
    },
    {
      from: "ecosystem",
      to: "test-suite",
      label: "covered by",
    },
  ];
  const edges = candidates.filter(
    (edge) => ids.has(edge.from) && ids.has(edge.to),
  );

  if (edges.length > 0) return edges;

  return nodes.slice(0, -1).map((node, index) => ({
    from: node.id,
    to: nodes[index + 1]?.id ?? node.id,
    label: flowLabelFor(nodes[index + 1]?.id ?? ""),
  }));
}

function inferLayers(files: SampledFile[]) {
  if (isFrameworkMonorepoSample(files)) {
    return inferFrameworkLayers(files);
  }

  const config = findConfigFile(files);
  const entry = findFirstFile(files, RUNTIME_FILE_PATTERNS);
  const provider = findFirstFile(files, PROVIDER_FILE_PATTERNS);
  const feature = findFirstFile(files, FEATURE_FILE_PATTERNS);
  const api = findFirstFile(files, API_FILE_PATTERNS);
  const data = findFirstFile(files, [
    ...DATA_FILE_PATTERNS,
    ...CONVEX_PATTERNS,
  ]);
  const job = findFirstFile(files, BACKGROUND_JOB_PATTERNS);
  const layers = [
    config
      ? {
          id: "setup",
          label: "Project Setup",
          description: "dependencies, scripts, and framework config",
          file: config,
        }
      : null,
    entry
      ? {
          id: "entry",
          label: "App Entry",
          description: "first page or runtime entry point",
          file: entry,
        }
      : null,
    provider
      ? {
          id: "providers",
          label: "Providers/Auth",
          description:
            "shared providers, auth middleware, themes, or request guards",
          file: provider,
        }
      : null,
    feature
      ? {
          id: "features",
          label: "Feature Modules",
          description:
            "domain UI, hooks, editor, chat, project, or preview features",
          file: feature,
        }
      : null,
    api
      ? {
          id: "server",
          label: "Server/API",
          description: "request handlers and backend logic",
          file: api,
        }
      : null,
    data
      ? {
          id: "data",
          label: "Data Layer",
          description: "database schema, models, or persistence code",
          file: data,
        }
      : null,
    job
      ? {
          id: "jobs",
          label: "Background Jobs",
          description: "queued work, imports, exports, or async processing",
          file: job,
        }
      : null,
  ].filter((layer): layer is NonNullable<typeof layer> => Boolean(layer));

  return dedupeLayers(layers).slice(0, 8);
}

function inferFrameworkLayers(files: SampledFile[]) {
  const docs = findFirstFile(files, FRAMEWORK_DOC_PATTERNS);
  const devEnv = findFirstFile(files, [".devcontainer/", ".conductor/"]);
  const core = findFirstFile(files, FRAMEWORK_CORE_PATTERNS);
  const rust = findFirstFile(files, RUST_BUILD_PATTERNS);
  const benchmarks = findFirstFile(files, BENCHMARK_PATTERNS);
  const tests = findFirstFile(files, TEST_SUITE_PATTERNS);
  const ecosystem = findFirstFile(files, ECOSYSTEM_PATTERNS);
  const layers = [
    docs
      ? {
          id: "contribution-guides",
          label: "Contribution Guidelines",
          description: "workflow, review, triage, and contributor docs",
          file: docs,
        }
      : null,
    devEnv
      ? {
          id: "development-environment",
          label: "Development Environment",
          description: "containers, worktrees, setup scripts, and dependencies",
          file: devEnv,
        }
      : null,
    core
      ? {
          id: "core-framework",
          label: "Next.js Core Framework",
          description: "framework runtime, server, router, and build pipeline",
          file: core,
        }
      : null,
    rust
      ? {
          id: "compile-engine",
          label: "Rust Build and Compile Engine",
          description: "compiler, bundler, native bindings, and task engine",
          file: rust,
        }
      : null,
    benchmarks
      ? {
          id: "benchmarks",
          label: "Performance Benchmarks",
          description: "performance measurement and regression detection",
          file: benchmarks,
        }
      : null,
    tests
      ? {
          id: "test-suite",
          label: "Comprehensive Testing Suite",
          description:
            "e2e, development, production, integration, and unit tests",
          file: tests,
        }
      : null,
    ecosystem
      ? {
          id: "ecosystem",
          label: "Ecosystem Tools and Examples",
          description: "create-next-app, lint plugins, codemods, and examples",
          file: ecosystem,
        }
      : null,
  ].filter((layer): layer is NonNullable<typeof layer> => Boolean(layer));

  return dedupeLayers(layers).slice(0, 8);
}

function inferTechStack(metadata: GitHubRepo, files: SampledFile[]) {
  const stack = new Set<string>();
  const packageFile = files.find((file) => file.path.endsWith("package.json"));

  if (metadata.language) stack.add(metadata.language);

  if (packageFile) {
    const dependencies = packageFile.content.toLowerCase();
    if (dependencies.includes('"next"')) stack.add("Next.js");
    if (dependencies.includes('"react"')) stack.add("React");
    if (dependencies.includes('"typescript"')) stack.add("TypeScript");
    if (dependencies.includes('"prisma"')) stack.add("Prisma");
    if (dependencies.includes('"@prisma/client"')) stack.add("Prisma Client");
    if (dependencies.includes('"@prisma/adapter-pg"')) stack.add("PostgreSQL");
    if (dependencies.includes('"pg"')) stack.add("PostgreSQL");
    if (dependencies.includes('"drizzle-orm"')) stack.add("Drizzle ORM");
    if (dependencies.includes('"mongoose"')) stack.add("MongoDB/Mongoose");
    if (dependencies.includes('"mongodb"')) stack.add("MongoDB");
    if (dependencies.includes('"convex"')) stack.add("Convex");
    if (dependencies.includes('"inngest"')) stack.add("Inngest");
    if (dependencies.includes('"@clerk/nextjs"')) stack.add("Clerk");
    if (dependencies.includes('"@ai-sdk/')) stack.add("AI SDK");
    if (
      dependencies.includes('"@anthropic-ai/') ||
      dependencies.includes('"@ai-sdk/anthropic"')
    )
      stack.add("Anthropic Claude");
    if (
      dependencies.includes('"@google/generative-ai"') ||
      dependencies.includes('"@ai-sdk/google"')
    )
      stack.add("Gemini");
    if (dependencies.includes('"@codemirror/')) stack.add("CodeMirror");
    if (dependencies.includes('"@webcontainer/api"')) stack.add("WebContainer");
    if (dependencies.includes('"@sentry/')) stack.add("Sentry");
    if (dependencies.includes('"tailwindcss"')) stack.add("Tailwind CSS");
    if (dependencies.includes('"openai"')) stack.add("OpenAI SDK");
  }

  for (const file of files) {
    if (file.path.startsWith("packages/next/")) stack.add("Next.js Framework");
    if (file.path.startsWith("crates/") || file.path.endsWith(".rs")) {
      stack.add("Rust");
    }
    if (pathMatches(file.path, BENCHMARK_PATTERNS)) stack.add("Benchmarks");
    if (pathMatches(file.path, TEST_SUITE_PATTERNS)) stack.add("Test Suites");
    if (file.path.startsWith("contributing/")) stack.add("Contributor Docs");
    if (file.path.endsWith(".tsx") || file.path.endsWith(".ts")) {
      stack.add("TypeScript");
    }
    if (file.path.includes("src/app/")) stack.add("Next.js App Router");
    if (file.path.endsWith("schema.prisma")) stack.add("Prisma");
    if (file.path.toLowerCase().includes("prisma.config")) stack.add("Prisma");
    if (file.content.includes('provider = "postgresql"')) {
      stack.add("PostgreSQL");
    }
    if (file.content.includes("PrismaPg") || file.content.includes("pg")) {
      stack.add("PostgreSQL");
    }
    if (file.path.startsWith("convex/")) stack.add("Convex");
    if (file.path.includes("inngest/")) stack.add("Inngest");
    if (file.path.includes("api/github/")) stack.add("GitHub API");
    if (file.path.includes("features/editor/")) stack.add("Code editor");
    if (file.path.includes("features/preview/")) stack.add("Preview runtime");
    if (file.path.includes("features/conversations/")) stack.add("AI chat");
  }

  return Array.from(stack).slice(0, 14);
}

function describeFilePurpose(file: SampledFile) {
  const path = file.path.toLowerCase();
  const name = path.split("/").at(-1) ?? path;

  if (path.startsWith("contributing/core/")) {
    return "documents the core framework contribution workflow, local development, building, testing, or debugging process.";
  }
  if (path.startsWith("contributing/repository/")) {
    return "documents repository management practices such as linting, pull request descriptions, and issue triage.";
  }
  if (path.startsWith(".cursor/commands/gt-workflow")) {
    return "documents the Graphite-based stacked branch workflow used for source control.";
  }
  if (path.startsWith(".conductor/")) {
    return "configures isolated parallel development worktrees and setup scripts.";
  }
  if (path.startsWith(".devcontainer/")) {
    return "installs development-container dependencies such as browser, Node.js, or Rust tooling.";
  }
  if (path.startsWith("packages/next/src/build/")) {
    return "implements the core Next.js build pipeline that prepares applications for development or production.";
  }
  if (path.startsWith("packages/next/src/server/")) {
    return "implements server-side framework runtime behavior and request handling.";
  }
  if (path.startsWith("packages/next/src/shared/")) {
    return "contains shared framework runtime utilities used across client, server, and build code.";
  }
  if (path.startsWith("crates/") || path.endsWith(".rs")) {
    return "contains Rust compiler, bundler, native binding, or task-engine code used by performance-sensitive framework internals.";
  }
  if (pathMatches(path, BENCHMARK_PATTERNS)) {
    return "measures framework performance so maintainers can detect regressions.";
  }
  if (pathMatches(path, TEST_SUITE_PATTERNS)) {
    return "validates framework behavior in one of the repository test suites.";
  }
  if (path.startsWith("packages/create-next-app/")) {
    return "implements the app scaffolding tool used to create new Next.js projects.";
  }
  if (path.startsWith("packages/eslint-plugin-next/")) {
    return "implements lint rules that guide users toward correct Next.js patterns.";
  }
  if (path.startsWith("packages/next-codemod/")) {
    return "implements codemods that help users upgrade between framework versions.";
  }
  if (name === "package.json") {
    return "shows scripts, dependencies, and the main framework choices.";
  }
  if (name.startsWith("next.config")) {
    return "configures how the Next.js app builds and runs.";
  }
  if (name === "tsconfig.json") {
    return "defines TypeScript rules and import aliases used across the code.";
  }
  if (name === "readme.md") {
    return "usually explains the project goal, setup, and usage commands.";
  }
  if (path.startsWith("convex/schema.")) {
    return "defines the Convex database tables, indexes, and app data model.";
  }
  if (path.startsWith("convex/")) {
    return "contains Convex queries, mutations, or internal server functions used by the app.";
  }
  if (path.endsWith("schema.prisma")) {
    return "defines the database models and relationships used by the app.";
  }
  if (path.includes("prisma.config")) {
    return "configures Prisma commands and how Prisma finds the database schema.";
  }
  if (path.includes("lib/db") || path.includes("database")) {
    return "configures the database client or shared persistence connection used by server code.";
  }
  if (path.includes("inngest/")) {
    return "defines background jobs or event-driven processing used for longer-running work.";
  }
  if (path.includes("providers.")) {
    return "wraps the application with shared providers such as auth, data clients, or theme state.";
  }
  if (path.includes("proxy.") || path.includes("middleware.")) {
    return "runs before requests to apply middleware such as authentication or routing guards.";
  }
  if (path.includes("features/conversations/")) {
    return "implements the AI conversation workflow and message handling.";
  }
  if (path.includes("features/editor/")) {
    return "implements the code editor interface, editor state, or editor extensions.";
  }
  if (path.includes("features/preview/")) {
    return "implements the preview/runtime surface that executes or displays project output.";
  }
  if (path.includes("features/projects/")) {
    return "implements project management, file import/export, or project-level UI.";
  }
  if (path.includes("/api/") || name.startsWith("route.")) {
    return "handles server requests and connects the UI to backend logic.";
  }
  if (path.includes("components/")) {
    return "renders reusable UI pieces that the main pages compose together.";
  }
  if (path.includes("hooks/")) {
    return "contains reusable client-side behavior shared by components.";
  }
  if (path.includes("lib/")) {
    return "contains shared business logic, helpers, or service code.";
  }
  if (path.includes("page.")) {
    return "renders a user-facing route and is a good place to start tracing the UI.";
  }
  if (path.includes("layout.")) {
    return "wraps pages with shared structure, metadata, fonts, or providers.";
  }

  return "is part of the sampled code path and may connect to nearby imports.";
}

function orderFilesForReading(files: SampledFile[]) {
  return [...files].sort((first, second) => {
    return readingPriority(first.path) - readingPriority(second.path);
  });
}

function readingPriority(path: string) {
  const lower = path.toLowerCase();
  const name = lower.split("/").at(-1) ?? lower;

  if (name === "readme.md") return 1;
  if (name === "package.json") return 2;
  if (lower.startsWith("contributing/core/")) return 3;
  if (lower.startsWith("contributing/repository/")) return 4;
  if (lower.startsWith(".cursor/")) return 5;
  if (lower.startsWith(".conductor/")) return 6;
  if (lower.startsWith(".devcontainer/")) return 7;
  if (lower.startsWith("packages/next/src/")) return 8;
  if (lower.startsWith("crates/")) return 9;
  if (pathMatches(lower, TEST_SUITE_PATTERNS)) return 10;
  if (pathMatches(lower, BENCHMARK_PATTERNS)) return 11;
  if (pathMatches(lower, ECOSYSTEM_PATTERNS)) return 12;
  if (CONFIG_FILE_NAMES.has(name)) return 3;
  if (lower.includes("proxy.") || lower.includes("middleware.")) return 4;
  if (lower.includes("providers.")) return 5;
  if (lower.includes("layout.")) return 6;
  if (lower.includes("page.")) return 7;
  if (lower.startsWith("convex/schema.")) return 8;
  if (lower.startsWith("convex/")) return 9;
  if (lower.includes("schema.prisma")) return 8;
  if (lower.includes("prisma.config")) return 9;
  if (lower.includes("lib/db") || lower.includes("database")) return 10;
  if (lower.includes("inngest/")) return 10;
  if (lower.includes("/api/") || name.startsWith("route.")) return 11;
  if (lower.includes("features/")) return 12;
  if (lower.includes("components/")) return 13;
  if (lower.includes("lib/")) return 14;
  return 20;
}

function findConfigFile(files: SampledFile[]) {
  return files.find((file) => {
    const name = file.path.toLowerCase().split("/").at(-1) ?? "";
    return CONFIG_FILE_NAMES.has(name);
  });
}

function findFirstFile(files: SampledFile[], patterns: string[]) {
  return files.find((file) => {
    const path = file.path.toLowerCase();
    return patterns.some((pattern) => path.includes(pattern.toLowerCase()));
  });
}

function dedupeLayers<T extends { id: string }>(layers: T[]) {
  const seen = new Set<string>();
  return layers.filter((layer) => {
    if (seen.has(layer.id)) return false;
    seen.add(layer.id);
    return true;
  });
}

function flowLabelFor(nodeId: string) {
  if (nodeId === "development-environment") return "sets up tools";
  if (nodeId === "core-framework") return "implements framework";
  if (nodeId === "compile-engine") return "compiles and bundles";
  if (nodeId === "benchmarks") return "measures performance";
  if (nodeId === "test-suite") return "validates behavior";
  if (nodeId === "ecosystem") return "ships user tools";
  if (nodeId === "entry") return "boots app";
  if (nodeId === "providers") return "wraps app";
  if (nodeId === "features") return "loads features";
  if (nodeId === "server") return "calls API";
  if (nodeId === "data") return "reads/writes data";
  if (nodeId === "jobs") return "queues async work";
  return "next step";
}

function asText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function asStringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string") &&
    value.length > 0
    ? value
    : fallback;
}

function normalizeWikiSections(
  value: unknown,
  fallback: RepositoryAnalysis["wikiSections"],
) {
  if (!Array.isArray(value)) return fallback;

  const sections = value
    .filter(
      (section): section is RepositoryAnalysis["wikiSections"][number] => {
        return (
          typeof section === "object" &&
          section !== null &&
          "title" in section &&
          "content" in section &&
          typeof section.title === "string" &&
          typeof section.content === "string" &&
          section.title.trim().length > 0 &&
          section.content.trim().length > 0
        );
      },
    )
    .slice(0, 12);

  return sections.length > 0 ? sections : fallback;
}

function normalizeNodes(value: unknown, fallback: DiagramNode[]) {
  if (!Array.isArray(value)) return fallback;

  const nodes = value
    .filter((node): node is DiagramNode => {
      return (
        typeof node === "object" &&
        node !== null &&
        "id" in node &&
        "label" in node &&
        typeof node.id === "string" &&
        typeof node.label === "string"
      );
    })
    .slice(0, 8);

  return nodes.length > 0 ? nodes : fallback;
}

function normalizeEdges(
  value: unknown,
  nodes: DiagramNode[],
  fallback: DiagramEdge[],
) {
  if (!Array.isArray(value)) return fallback;

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = value
    .filter((edge): edge is DiagramEdge => {
      return (
        typeof edge === "object" &&
        edge !== null &&
        "from" in edge &&
        "to" in edge &&
        typeof edge.from === "string" &&
        typeof edge.to === "string" &&
        nodeIds.has(edge.from) &&
        nodeIds.has(edge.to)
      );
    })
    .slice(0, 12);

  return edges.length > 0 ? edges : fallback;
}
