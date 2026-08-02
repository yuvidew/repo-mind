"use client";

import {
  AlertCircle,
  Check,
  ChevronRight,
  Clipboard,
  Code2,
  ExternalLink,
  FileCode2,
  FileText,
  Folder,
  FolderTree,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { KeyFile } from "@/lib/analysis-types";
import { cn } from "@/lib/utils";

type RepoFilesSectionProps = {
  analyzedRef?: string | null;
  openRequest?: RepoFileOpenRequest | null;
  repoId: string;
  repoUrl?: string;
  suggestedFiles?: KeyFile[];
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

type FileScope = "all" | "suggested" | "source" | "docs";

export const RepoFilesSection = ({
  analyzedRef,
  openRequest,
  repoId,
  repoUrl,
  suggestedFiles = [],
}: RepoFilesSectionProps) => {
  const [files, setFiles] = useState<RepoFileListItem[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [highlightRange, setHighlightRange] =
    useState<FileHighlightRange | null>(null);
  const [requestedPath, setRequestedPath] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<FileScope>("all");
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
  const suggestedPathSet = useMemo(
    () =>
      new Set(
        suggestedFiles
          .filter((file) => file.path && !isGeneratedReportPath(file.path))
          .map((file) => normalizeRepoPath(file.path)),
      ),
    [suggestedFiles],
  );

  const scopedFiles = useMemo(() => {
    switch (scope) {
      case "suggested":
        return structureFiles.filter((file) =>
          suggestedPathSet.has(normalizeRepoPath(file.path)),
        );
      case "source":
        return structureFiles.filter((file) => isSourceFile(file));
      case "docs":
        return structureFiles.filter((file) => isDocumentationFile(file.path));
      default:
        return structureFiles;
    }
  }, [scope, structureFiles, suggestedPathSet]);

  const scopeOptions = useMemo<
    Array<{ count: number; label: string; value: FileScope }>
  >(
    () => [
      { count: structureFiles.length, label: "All", value: "all" },
      {
        count: structureFiles.filter((file) =>
          suggestedPathSet.has(normalizeRepoPath(file.path)),
        ).length,
        label: "Key",
        value: "suggested",
      },
      {
        count: structureFiles.filter((file) => isSourceFile(file)).length,
        label: "Source",
        value: "source",
      },
      {
        count: structureFiles.filter((file) => isDocumentationFile(file.path))
          .length,
        label: "Docs",
        value: "docs",
      },
    ],
    [structureFiles, suggestedPathSet],
  );

  const openResolvedFile = useCallback(
    (path: string, range?: FileHighlightRange) => {
      const resolvedPath = resolveRepoFilePath(path, files);

      setQuery("");
      setScope("all");
      setRequestedPath(resolvedPath && resolvedPath !== path ? path : null);
      setHighlightRange({
        endLine: range?.endLine,
        startLine: range?.startLine,
      });
      setActivePath(resolvedPath ?? path);
    },
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

      openResolvedFile(detail.path, {
        endLine: detail.endLine,
        startLine: detail.startLine,
      });
    };

    window.addEventListener("repomind:open-file", openFile);

    return () => {
      window.removeEventListener("repomind:open-file", openFile);
    };
  }, [openResolvedFile]);

  useEffect(() => {
    if (!openRequest?.path) return;

    openResolvedFile(openRequest.path, {
      endLine: openRequest.endLine,
      startLine: openRequest.startLine,
    });
  }, [openRequest, openResolvedFile]);

  const filteredFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return scopedFiles;

    return scopedFiles.filter((file) =>
      file.path.toLowerCase().includes(normalizedQuery),
    );
  }, [scopedFiles, query]);

  const activeListFile = useMemo(
    () => files.find((file) => file.path === activePath) ?? null,
    [activePath, files],
  );
  const tree = useMemo(() => buildFileTree(filteredFiles), [filteredFiles]);
  const readingOrder = useMemo(
    () =>
      suggestedFiles
        .filter((file) => file.path && !isGeneratedReportPath(file.path))
        .slice(0, 6),
    [suggestedFiles],
  );

  function openSuggestedFile(file: KeyFile) {
    openResolvedFile(file.path, {
      endLine: file.citation?.endLine,
      startLine: file.citation?.startLine,
    });
  }

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
        <div className="grid grid-cols-2 gap-2 text-sm sm:flex md:justify-end">
          <Badge variant="outline">
            {structureFiles.length.toLocaleString()} saved
          </Badge>
          <Badge variant="outline">
            {filteredFiles.length.toLocaleString()} visible
          </Badge>
          {activePath ? <Badge variant="secondary">File selected</Badge> : null}
        </div>
      </div>

      {readingOrder.length > 0 ? (
        <div className="rounded-lg border bg-background p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-medium">Suggested reading order</h3>
              <p className="text-muted-foreground text-sm leading-6">
                Open the generated key files directly in the source viewer.
              </p>
            </div>
            <Badge variant="secondary">{readingOrder.length} files</Badge>
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {readingOrder.map((file, index) => (
              <button
                className={cn(
                  "min-w-0 rounded-lg border bg-muted/15 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5",
                  activePath === file.path &&
                    "border-primary/40 bg-primary/5 text-foreground",
                )}
                key={`${file.path}-${index}`}
                onClick={() => openSuggestedFile(file)}
                title={file.path}
                type="button"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background font-medium text-muted-foreground text-xs">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">{file.path}</p>
                    <p className="mt-1 line-clamp-2 text-muted-foreground text-xs leading-5">
                      {file.purpose}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Card className="overflow-hidden border-primary/10 bg-background p-0 shadow-sm">
        <CardContent className="grid min-h-[720px] p-0 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
          <aside className="border-b bg-muted/20 xl:border-r xl:border-b-0">
            <div className="space-y-3 border-b p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-primary">
                    <FolderTree className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">File navigator</p>
                    <p className="truncate text-muted-foreground text-xs">
                      Search saved paths and key files
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  {filteredFiles.length.toLocaleString()}
                </Badge>
              </div>
              <div className="relative">
                <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
                <Input
                  className="bg-background pr-9 pl-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search saved files"
                  value={query}
                />
                {query ? (
                  <Button
                    aria-label="Clear file search"
                    className="-translate-y-1/2 absolute top-1/2 right-1.5"
                    onClick={() => setQuery("")}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                  >
                    <X className="size-3.5" />
                  </Button>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-md border bg-background p-1">
                {scopeOptions.map((option) => (
                  <button
                    aria-pressed={scope === option.value}
                    className={cn(
                      "flex min-w-0 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                      scope === option.value
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    disabled={option.count === 0}
                    key={option.value}
                    onClick={() => setScope(option.value)}
                    type="button"
                  >
                    <span className="truncate">{option.label}</span>
                    <span className="shrink-0 text-[10px]">
                      {option.count.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>{scopeLabel(scope)} files</span>
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
                      setRequestedPath(null);
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
            requestedPath={requestedPath}
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
              "flex w-full min-w-0 items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted/70",
              selectedPath === file.path &&
                "bg-primary/10 font-medium text-primary hover:bg-primary/10",
            )}
            key={file.path}
            onClick={() => onSelect(file.path)}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            title={file.path}
            type="button"
          >
            <FileCode2 className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">{file.path.split("/").at(-1)}</span>
                {file.language ? (
                  <span className="shrink-0 rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {file.language}
                  </span>
                ) : null}
              </span>
              {selectedPath === file.path && file.summary ? (
                <span className="mt-1 line-clamp-2 text-muted-foreground text-xs leading-5">
                  {file.summary}
                </span>
              ) : null}
            </span>
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
  requestedPath,
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
  requestedPath: string | null;
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
            <PathBreadcrumbs path={displayFile?.path ?? activePath} />
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

        {requestedPath && displayFile?.path !== requestedPath ? (
          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-muted-foreground text-xs leading-5">
            Citation path <span className="font-medium">{requestedPath}</span>{" "}
            matched saved file{" "}
            <span className="font-medium">{displayFile?.path}</span>.
          </div>
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

function PathBreadcrumbs({ path }: { path: string }) {
  const parts = path.split("/").filter(Boolean);
  const directories = parts
    .slice(0, -1)
    .reduce<Array<{ name: string; path: string }>>((items, part) => {
      const parentPath = items.at(-1)?.path;

      items.push({
        name: part,
        path: parentPath ? `${parentPath}/${part}` : part,
      });

      return items;
    }, []);

  if (parts.length <= 1) {
    return <p className="text-muted-foreground text-xs">Repository root</p>;
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1 text-muted-foreground text-xs">
      <span>Repository</span>
      {directories.map((directory, index) => (
        <span
          className="inline-flex min-w-0 items-center gap-1"
          key={directory.path}
        >
          <ChevronRight className="size-3" />
          <span className="max-w-32 truncate">{directory.name}</span>
          {index === directories.length - 1 ? (
            <>
              <ChevronRight className="size-3" />
              <span className="max-w-40 truncate text-foreground">
                {parts.at(-1)}
              </span>
            </>
          ) : null}
        </span>
      ))}
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
  const effectiveHighlightRange = getClampedHighlightRange(
    highlightRange,
    lines.length,
  );
  const isHighlightOutOfRange =
    Boolean(highlightRange?.startLine) && !effectiveHighlightRange;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/10 px-4 py-2 text-muted-foreground text-xs">
        <div className="flex items-center gap-2">
          <FileText className="size-3.5" />
          <span>{lines.length.toLocaleString()} lines</span>
        </div>
        {effectiveHighlightRange ? (
          <Badge className="bg-primary/10 text-primary" variant="outline">
            Highlighting lines {formatLineRange(effectiveHighlightRange)}
          </Badge>
        ) : null}
      </div>

      {isHighlightOutOfRange ? (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-amber-700 text-xs leading-5 dark:text-amber-300">
          The cited line range is outside this saved file, so RepoMind opened
          the file without a highlighted range.
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto font-mono text-xs leading-5">
        <div className="min-w-max py-3">
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const isHighlighted = isLineHighlighted(
              lineNumber,
              effectiveHighlightRange,
            );

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
                  title={`Line ${lineNumber}`}
                >
                  {lineNumber}
                </span>
                <code className="whitespace-pre px-3">{line || " "}</code>
              </div>
            );
          })}
        </div>
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

function isSourceFile(file: RepoFileListItem) {
  if (file.isBinary || file.skippedReason) return false;
  if (isDocumentationFile(file.path)) return false;

  const extension = file.path.split(".").at(-1)?.toLowerCase();
  const sourceExtensions = new Set([
    "c",
    "cpp",
    "cs",
    "css",
    "go",
    "html",
    "java",
    "js",
    "json",
    "jsx",
    "kt",
    "mjs",
    "php",
    "py",
    "rs",
    "scss",
    "sh",
    "sql",
    "svelte",
    "swift",
    "ts",
    "tsx",
    "vue",
    "yml",
    "yaml",
  ]);

  return Boolean(
    file.language || (extension && sourceExtensions.has(extension)),
  );
}

function isDocumentationFile(path: string) {
  const normalizedPath = normalizeRepoPath(path).toLowerCase();
  const name = normalizedPath.split("/").at(-1) ?? normalizedPath;

  return (
    normalizedPath.startsWith("docs/") ||
    normalizedPath.includes("/docs/") ||
    name === "readme.md" ||
    name === "license" ||
    name === "license.md" ||
    name === "changelog.md" ||
    name === "contributing.md" ||
    name.endsWith(".md") ||
    name.endsWith(".mdx") ||
    name.endsWith(".rst") ||
    name.endsWith(".txt")
  );
}

function scopeLabel(scope: FileScope) {
  switch (scope) {
    case "suggested":
      return "Key";
    case "source":
      return "Source";
    case "docs":
      return "Docs";
    default:
      return "All";
  }
}

function resolveRepoFilePath(path: string, files: RepoFileListItem[]) {
  if (files.length === 0) return null;

  const normalizedPath = normalizeRepoPath(path).toLowerCase();
  const candidates = files.map((file) => ({
    file,
    normalized: normalizeRepoPath(file.path).toLowerCase(),
  }));

  const exactMatch = candidates.find(
    (candidate) => candidate.normalized === normalizedPath,
  );

  if (exactMatch) return exactMatch.file.path;

  const suffixMatches = candidates.filter(
    (candidate) =>
      candidate.normalized.endsWith(`/${normalizedPath}`) ||
      normalizedPath.endsWith(`/${candidate.normalized}`),
  );

  if (suffixMatches.length === 1) return suffixMatches[0].file.path;

  const requestedName = normalizedPath.split("/").at(-1);
  const nameMatches = candidates.filter(
    (candidate) => candidate.normalized.split("/").at(-1) === requestedName,
  );

  return nameMatches.length === 1 ? nameMatches[0].file.path : null;
}

function normalizeRepoPath(path: string) {
  return path
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

function isLineHighlighted(
  lineNumber: number,
  highlightRange: FileHighlightRange | null,
) {
  if (!highlightRange?.startLine) return false;

  const endLine = highlightRange.endLine ?? highlightRange.startLine;
  return lineNumber >= highlightRange.startLine && lineNumber <= endLine;
}

function getClampedHighlightRange(
  range: FileHighlightRange | null,
  lineCount: number,
): FileHighlightRange | null {
  if (!range?.startLine || range.startLine > lineCount) return null;

  return {
    endLine: Math.min(range.endLine ?? range.startLine, lineCount),
    startLine: Math.max(range.startLine, 1),
  };
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
