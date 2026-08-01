"use client";

import {
  AlertCircle,
  Check,
  Clipboard,
  Code2,
  ExternalLink,
  FileCode2,
  Folder,
  Loader2,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type RepoFilesSectionProps = {
  analyzedRef?: string | null;
  openRequest?: RepoFileOpenRequest | null;
  repoId: string;
  repoUrl?: string;
};

type RepoFileListItem = {
  id: string;
  isBinary: boolean;
  language: string | null;
  path: string;
  sha: string | null;
  sizeBytes: number;
  skippedReason: string | null;
  summary: string | null;
  updatedAt: string;
};

type RepoFileDetail = RepoFileListItem & {
  content: string | null;
};

type FileTreeNode = {
  children: Map<string, FileTreeNode>;
  file?: RepoFileListItem;
  name: string;
  path: string;
  type: "directory" | "file";
};

type FileHighlightRange = {
  endLine?: number;
  startLine?: number;
};

type RepoFileOpenRequest = FileHighlightRange & {
  id: string;
  path: string;
};

type CopyTarget = "code" | "path";

export const RepoFilesSection = ({
  analyzedRef,
  openRequest,
  repoId,
  repoUrl,
}: RepoFilesSectionProps) => {
  const [files, setFiles] = useState<RepoFileListItem[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [highlightRange, setHighlightRange] =
    useState<FileHighlightRange | null>(null);
  const [query, setQuery] = useState("");
  const [activeFile, setActiveFile] = useState<RepoFileDetail | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadFiles() {
      setIsLoadingList(true);
      setListError(null);

      try {
        const response = await fetch(`/api/repos/${repoId}/files`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load repository files.");
        }

        if (!isMounted) return;

        const loadedFiles = (data.files ?? []) as RepoFileListItem[];
        setFiles(loadedFiles);
      } catch (loadError) {
        if (isMounted) {
          setListError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load repository files.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingList(false);
        }
      }
    }

    loadFiles();

    return () => {
      isMounted = false;
    };
  }, [repoId]);

  useEffect(() => {
    if (!activePath) {
      setActiveFile(null);
      setFileError(null);
      return;
    }

    const pathToLoad = activePath;
    let isMounted = true;

    async function loadFile() {
      setActiveFile(null);
      setIsLoadingFile(true);
      setFileError(null);
      setCopiedTarget(null);

      try {
        const response = await fetch(
          `/api/repos/${repoId}/files?path=${encodeURIComponent(pathToLoad)}`,
          { cache: "no-store" },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load this file.");
        }

        if (!isMounted) return;

        const loadedFile = data.file as RepoFileDetail;
        setActiveFile(loadedFile);
        setFiles((currentFiles) =>
          currentFiles.map((file) =>
            file.path === loadedFile.path
              ? {
                  ...file,
                  isBinary: loadedFile.isBinary,
                  language: loadedFile.language,
                  sha: loadedFile.sha,
                  sizeBytes: loadedFile.sizeBytes,
                  skippedReason: loadedFile.skippedReason,
                  summary: loadedFile.summary,
                  updatedAt: loadedFile.updatedAt,
                }
              : file,
          ),
        );
      } catch (loadError) {
        if (isMounted) {
          setActiveFile(null);
          setFileError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load this file.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingFile(false);
        }
      }
    }

    loadFile();

    return () => {
      isMounted = false;
    };
  }, [activePath, repoId]);

  useEffect(() => {
    if (!(activeFile && highlightRange?.startLine && !isLoadingFile)) return;

    const lineId = getLineElementId(activeFile.id, highlightRange.startLine);

    window.requestAnimationFrame(() => {
      document.getElementById(lineId)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [activeFile, highlightRange, isLoadingFile]);

  const structureFiles = useMemo(
    () => files.filter((file) => !isGeneratedReportPath(file.path)),
    [files],
  );

  useEffect(() => {
    const openFile = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        endLine?: number;
        path?: string;
        startLine?: number;
      };

      if (!detail.path) return;

      setQuery("");
      setHighlightRange({
        endLine: detail.endLine,
        startLine: detail.startLine,
      });
      setActivePath(detail.path);
    };

    window.addEventListener("repomind:open-file", openFile);

    return () => {
      window.removeEventListener("repomind:open-file", openFile);
    };
  }, []);

  useEffect(() => {
    if (!openRequest?.path) return;

    setQuery("");
    setHighlightRange({
      endLine: openRequest.endLine,
      startLine: openRequest.startLine,
    });
    setActivePath(openRequest.path);
  }, [openRequest]);

  const filteredFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return structureFiles;

    return structureFiles.filter((file) =>
      file.path.toLowerCase().includes(normalizedQuery),
    );
  }, [structureFiles, query]);

  const activeListFile = useMemo(
    () => files.find((file) => file.path === activePath) ?? null,
    [activePath, files],
  );
  const tree = useMemo(() => buildFileTree(filteredFiles), [filteredFiles]);

  async function copyToClipboard(value: string, target: CopyTarget) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedTarget(target);
      window.setTimeout(() => setCopiedTarget(null), 1200);
    } catch {
      setFileError("Unable to copy to clipboard from this browser context.");
    }
  }

  return (
    <section id="files" className="space-y-4 scroll-mt-24">
      <div className="flex flex-col gap-3 rounded-lg border bg-background p-5 shadow-sm md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileCode2 className="size-4" />
            </span>
            <h2 className="font-semibold text-2xl tracking-normal">
              Repository files
            </h2>
          </div>
          <p className="max-w-3xl text-muted-foreground text-sm leading-6">
            Browse saved repository files, inspect source, and verify cited line
            ranges in the code viewer.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm sm:flex">
          <Badge variant="outline">
            {structureFiles.length.toLocaleString()} saved
          </Badge>
          <Badge variant="outline">
            {filteredFiles.length.toLocaleString()} visible
          </Badge>
        </div>
      </div>

      <Card className="overflow-hidden border-primary/10 bg-background p-0 shadow-sm">
        <CardContent className="grid min-h-[720px] p-0 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
          <aside className="border-b bg-muted/20 xl:border-r xl:border-b-0">
            <div className="space-y-3 border-b p-3">
              <div className="relative">
                <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
                <Input
                  className="bg-background pl-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search saved files"
                  value={query}
                />
              </div>
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>{filteredFiles.length.toLocaleString()} visible</span>
                <span>{structureFiles.length.toLocaleString()} saved</span>
              </div>
            </div>

            <ScrollArea className="h-[640px] overflow-hidden **:data-[slot=scroll-area-scrollbar]:w-1.5 **:data-[slot=scroll-area-thumb]:bg-muted-foreground/25 **:data-[slot=scroll-area-thumb]:hover:bg-muted-foreground/45">
              <div className="p-2">
                {isLoadingList ? (
                  <LoadingState label="Loading structure" />
                ) : listError ? (
                  <div className="p-2">
                    <Alert variant="destructive">
                      <AlertCircle className="size-4" />
                      <AlertTitle>Unable to load structure</AlertTitle>
                      <AlertDescription>{listError}</AlertDescription>
                    </Alert>
                  </div>
                ) : filteredFiles.length > 0 ? (
                  <FileTree
                    node={tree}
                    onSelect={(path) => {
                      setHighlightRange(null);
                      setActivePath(path);
                    }}
                    selectedPath={activePath}
                  />
                ) : (
                  <EmptyState label="No paths match this search." />
                )}
              </div>
            </ScrollArea>
          </aside>

          <FileViewer
            activeFile={activeFile}
            activeListFile={activeListFile}
            activePath={activePath}
            analyzedRef={analyzedRef}
            copiedTarget={copiedTarget}
            error={fileError}
            highlightRange={highlightRange}
            isLoading={isLoadingFile}
            onCopy={copyToClipboard}
            repoUrl={repoUrl}
          />
        </CardContent>
      </Card>
    </section>
  );
};

function FileTree({
  node,
  onSelect,
  selectedPath,
  depth = 0,
}: {
  node: FileTreeNode;
  onSelect: (path: string) => void;
  selectedPath: string | null;
  depth?: number;
}) {
  const children = Array.from(node.children.values()).sort((first, second) => {
    if (first.type !== second.type) return first.type === "directory" ? -1 : 1;
    return first.name.localeCompare(second.name);
  });

  return (
    <div className="space-y-0.5">
      {children.map((child) => {
        if (child.type === "directory") {
          return (
            <div key={child.path}>
              <div
                className="flex items-center gap-2 rounded-md px-2 py-1.5 font-medium text-muted-foreground text-xs"
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
              >
                <Folder className="size-3.5" />
                <span className="truncate">{child.name}</span>
              </div>
              <FileTree
                depth={depth + 1}
                node={child}
                onSelect={onSelect}
                selectedPath={selectedPath}
              />
            </div>
          );
        }

        const file = child.file;

        if (!file) return null;

        return (
          <button
            className={cn(
              "flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/70",
              selectedPath === file.path &&
                "bg-primary/10 font-medium text-primary hover:bg-primary/10",
            )}
            key={file.path}
            onClick={() => onSelect(file.path)}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            title={file.path}
            type="button"
          >
            <FileCode2 className="size-3.5 shrink-0" />
            <span className="truncate">{file.path.split("/").at(-1)}</span>
          </button>
        );
      })}
    </div>
  );
}

function FileViewer({
  activeFile,
  activeListFile,
  activePath,
  analyzedRef,
  copiedTarget,
  error,
  highlightRange,
  isLoading,
  onCopy,
  repoUrl,
}: {
  activeFile: RepoFileDetail | null;
  activeListFile: RepoFileListItem | null;
  activePath: string | null;
  analyzedRef?: string | null;
  copiedTarget: CopyTarget | null;
  error: string | null;
  highlightRange: FileHighlightRange | null;
  isLoading: boolean;
  onCopy: (value: string, target: CopyTarget) => void;
  repoUrl?: string;
}) {
  const displayFile = activeFile ?? activeListFile;
  const githubUrl = displayFile
    ? buildGitHubFileUrl({
        path: displayFile.path,
        ref: analyzedRef,
        repoUrl,
      })
    : null;
  const hasContent = typeof activeFile?.content === "string";

  if (!activePath) {
    return (
      <div className="flex min-h-[640px] items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Code2 className="size-6" />
          </div>
          <p className="font-medium">Select a file to inspect</p>
          <p className="mt-2 text-muted-foreground text-sm leading-6">
            Choose a source file from the tree or click a citation to open code
            with highlighted lines.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[640px] min-w-0 flex-col">
      <div className="space-y-3 border-b bg-muted/10 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex min-w-0 items-center gap-2">
              <FileCode2 className="size-4 shrink-0 text-primary" />
              <h3 className="min-w-0 break-all font-medium text-sm">
                {displayFile?.path ?? activePath}
              </h3>
            </div>
            {displayFile ? (
              <FileMeta file={displayFile} highlightRange={highlightRange} />
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              disabled={!displayFile}
              onClick={() => displayFile && onCopy(displayFile.path, "path")}
              size="sm"
              type="button"
              variant="outline"
            >
              {copiedTarget === "path" ? <Check /> : <Clipboard />}
              {copiedTarget === "path" ? "Copied" : "Copy path"}
            </Button>
            <Button
              disabled={!hasContent}
              onClick={() =>
                activeFile?.content && onCopy(activeFile.content, "code")
              }
              size="sm"
              type="button"
              variant="outline"
            >
              {copiedTarget === "code" ? <Check /> : <Clipboard />}
              {copiedTarget === "code" ? "Copied" : "Copy code"}
            </Button>
            {githubUrl ? (
              <Button asChild size="sm" type="button" variant="outline">
                <a href={githubUrl} rel="noreferrer" target="_blank">
                  <ExternalLink />
                  Open GitHub
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        {displayFile?.summary ? (
          <p className="text-muted-foreground text-sm leading-6 wrap-anywhere">
            {displayFile.summary}
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <LoadingState label="Loading file content" />
      ) : error ? (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Unable to load file</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      ) : !activeFile ? (
        <EmptyState label="This file is not available in the saved analysis." />
      ) : activeFile.isBinary ? (
        <UnavailableFileState
          title="Binary file"
          description="RepoMind saved this path, but binary files are not rendered in the source viewer."
        />
      ) : activeFile.skippedReason ? (
        <UnavailableFileState
          title="Skipped file"
          description={activeFile.skippedReason}
        />
      ) : !hasContent ? (
        <UnavailableFileState
          title="Content unavailable"
          description="RepoMind could not load this file content from the saved analysis or GitHub."
        />
      ) : (
        <CodeViewer file={activeFile} highlightRange={highlightRange} />
      )}
    </div>
  );
}

function FileMeta({
  file,
  highlightRange,
}: {
  file: RepoFileListItem;
  highlightRange: FileHighlightRange | null;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="outline">{file.language ?? "Unknown"}</Badge>
      <Badge variant="outline">{formatBytes(file.sizeBytes)}</Badge>
      <Badge variant="outline">{formatDate(file.updatedAt)}</Badge>
      {file.sha ? (
        <Badge variant="outline">{file.sha.slice(0, 7)}</Badge>
      ) : null}
      {highlightRange?.startLine ? (
        <Badge className="bg-primary/10 text-primary" variant="outline">
          lines {formatLineRange(highlightRange)}
        </Badge>
      ) : null}
    </div>
  );
}

function CodeViewer({
  file,
  highlightRange,
}: {
  file: RepoFileDetail;
  highlightRange: FileHighlightRange | null;
}) {
  const lines = file.content?.split(/\r?\n/) ?? [""];

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-background font-mono text-xs leading-5">
      <div className="min-w-max py-3">
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const isHighlighted = isLineHighlighted(lineNumber, highlightRange);

          return (
            <div
              className={cn(
                "grid grid-cols-[4rem_minmax(0,1fr)]",
                isHighlighted && "bg-primary/10 text-foreground",
              )}
              id={getLineElementId(file.id, lineNumber)}
              key={`${file.id}-${lineNumber}`}
            >
              <span
                className={cn(
                  "select-none border-r px-3 text-right text-muted-foreground",
                  isHighlighted && "border-primary/30 text-primary",
                )}
              >
                {lineNumber}
              </span>
              <code className="whitespace-pre px-3">{line || " "}</code>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-2 p-6 text-muted-foreground text-sm">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center px-4 text-center text-muted-foreground text-sm">
      {label}
    </div>
  );
}

function UnavailableFileState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="p-4">
      <Alert>
        <AlertCircle className="size-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
    </div>
  );
}

function buildFileTree(files: RepoFileListItem[]) {
  const root: FileTreeNode = {
    children: new Map(),
    name: "",
    path: "",
    type: "directory",
  };

  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let current = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const path = parts.slice(0, index + 1).join("/");
      const existing = current.children.get(part);

      if (existing) {
        current = existing;
        return;
      }

      const node: FileTreeNode = {
        children: new Map(),
        file: isFile ? file : undefined,
        name: part,
        path,
        type: isFile ? "file" : "directory",
      };

      current.children.set(part, node);
      current = node;
    });
  }

  return root;
}

function isGeneratedReportPath(path: string) {
  const normalizedPath = path.toLowerCase();
  return (
    normalizedPath.startsWith("report/") &&
    (normalizedPath.endsWith(".md") || normalizedPath.endsWith(".mdx"))
  );
}

function isLineHighlighted(
  lineNumber: number,
  highlightRange: FileHighlightRange | null,
) {
  if (!highlightRange?.startLine) return false;

  const endLine = highlightRange.endLine ?? highlightRange.startLine;
  return lineNumber >= highlightRange.startLine && lineNumber <= endLine;
}

function getLineElementId(fileId: string, lineNumber: number) {
  return `repo-file-line-${fileId}-${lineNumber}`;
}

function formatLineRange(range: FileHighlightRange) {
  if (!range.startLine) return "unknown";
  if (!range.endLine || range.endLine === range.startLine) {
    return `${range.startLine}`;
  }

  return `${range.startLine}-${range.endLine}`;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;

  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Updated recently";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildGitHubFileUrl(input: {
  path: string;
  ref?: string | null;
  repoUrl?: string;
}) {
  if (!(input.repoUrl && input.ref) || isGeneratedReportPath(input.path)) {
    return null;
  }

  const normalizedRepoUrl = input.repoUrl.replace(/\/$/, "");
  return `${normalizedRepoUrl}/blob/${encodeGitHubPath(input.ref)}/${encodeGitHubPath(input.path)}`;
}

function encodeGitHubPath(value: string) {
  return value.split("/").map(encodeURIComponent).join("/");
}
