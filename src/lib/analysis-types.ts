export type DiagramNode = {
  id: string;
  label: string;
  detail?: string;
  citation?: SourceCitation;
};

export type DiagramEdge = {
  from: string;
  to: string;
  label?: string;
};

export type KeyFile = {
  path: string;
  purpose: string;
  citation?: SourceCitation;
};

export type WikiSection = {
  title: string;
  content: string;
  citations?: SourceCitation[];
};

export type AnalysisMode = "fast" | "deep";

export type AnalysisSource = "ai" | "fallback";

export type FreshnessStatus = "fresh" | "stale" | "unknown";

export type SourceCitation = {
  path: string;
  startLine?: number;
  endLine?: number;
  url?: string;
  source: "github" | "sampled-source" | "report" | "manual";
  label?: string;
};

export type AnalysisProvenance = {
  generatedAt: string;
  analyzedCommitSha: string | null;
  latestCommitSha: string | null;
  freshnessStatus: FreshnessStatus;
  provider: string;
  model: string | null;
  promptVersion: string;
};

export type SampledFileSnippet = {
  path: string;
  content: string;
  sha?: string;
  sourceUrl?: string;
};

export type AnalysisDebug = {
  source: AnalysisSource;
  provider: string;
  model: string | null;
  selectedFiles: string[];
  sampledFiles?: SampledFileSnippet[];
  detectedStack: string[];
  treeTruncated: boolean;
};

export type RepositoryAnalysis = {
  repo: {
    owner: string;
    name: string;
    url: string;
    defaultBranch: string;
    description: string | null;
    stars: number;
    language: string | null;
    fileCount: number;
    sampledFiles: number;
    analysisMode: AnalysisMode;
  };
  provenance: AnalysisProvenance;
  summary: string;
  plainEnglish: string;
  techStack: string[];
  architecture: string;
  dataFlow: string;
  keyFiles: KeyFile[];
  wikiSections: WikiSection[];
  risks: string[];
  beginnerGuide: string[];
  diagram: {
    nodes: DiagramNode[];
    edges: DiagramEdge[];
  };
  debug: AnalysisDebug;
  warnings: string[];
};
