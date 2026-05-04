export type DiagramNode = {
  id: string;
  label: string;
  detail?: string;
};

export type DiagramEdge = {
  from: string;
  to: string;
  label?: string;
};

export type KeyFile = {
  path: string;
  purpose: string;
};

export type WikiSection = {
  title: string;
  content: string;
};

export type AnalysisMode = "fast" | "deep";

export type AnalysisSource = "ai" | "fallback";

export type SampledFileSnippet = {
  path: string;
  content: string;
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
