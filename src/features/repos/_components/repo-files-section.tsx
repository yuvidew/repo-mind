"use client";

import { AlertCircle, FileCode2, Folder, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type RepoFilesSectionProps = {
  repoId: string;
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

export const RepoFilesSection = ({ repoId }: RepoFilesSectionProps) => {
  const [files, setFiles] = useState<RepoFileListItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<RepoFileDetail | null>(null);
  const [query, setQuery] = useState("");
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightRange, setHighlightRange] = useState<{
    endLine?: number;
    startLine?: number;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadFiles() {
      setIsLoadingList(true);
      setError(null);

      try {
        const response = await fetch(`/api/repos/${repoId}/files`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load repository files.");
        }

        if (!isMounted) return;

        const loadedFiles = (data.files ?? []) as RepoFileListItem[];
        setFiles(loadedFiles);
        setSelectedPath(
          (currentPath) =>
            currentPath ??
            loadedFiles.find((file) => !(file.isBinary || file.skippedReason))
              ?.path ??
            loadedFiles[0]?.path ??
            null,
        );
      } catch (loadError) {
        if (isMounted) {
          setError(
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
    const openFile = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        endLine?: number;
        path?: string;
        startLine?: number;
      };

      if (!detail.path) return;

      setQuery("");
      setSelectedPath(detail.path);
      setHighlightRange({
        endLine: detail.endLine,
        startLine: detail.startLine,
      });
    };

    window.addEventListener("repomind:open-file", openFile);

    return () => {
      window.removeEventListener("repomind:open-file", openFile);
    };
  }, []);

  useEffect(() => {
    if (!selectedPath) {
      setSelectedFile(null);
      return;
    }

    const pathToLoad = selectedPath;
    let isMounted = true;

    async function loadFile() {
      setIsLoadingFile(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/repos/${repoId}/files?path=${encodeURIComponent(pathToLoad)}`,
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to open this file.");
        }

        if (isMounted) {
          setSelectedFile(data.file as RepoFileDetail);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to open this file.",
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
  }, [repoId, selectedPath]);

  const filteredFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return files;

    return files.filter((file) =>
      file.path.toLowerCase().includes(normalizedQuery),
    );
  }, [files, query]);

  const tree = useMemo(() => buildFileTree(filteredFiles), [filteredFiles]);

  return (
    <section id="files" className="space-y-4 scroll-mt-24">
      <div className="space-y-1">
        <h2 className="font-semibold text-2xl tracking-normal">Files</h2>
        <p className="text-muted-foreground text-sm leading-6">
          Browse saved analysis files and inspect persisted source snippets with
          line numbers.
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <CardContent className="grid min-h-130 p-0 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b bg-muted/15 lg:border-r lg:border-b-0">
            <div className="space-y-3 border-b p-3">
              <div className="relative">
                <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search files"
                  value={query}
                />
              </div>
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>{filteredFiles.length.toLocaleString()} visible</span>
                <span>{files.length.toLocaleString()} saved</span>
              </div>
            </div>

            <div className="max-h-115 overflow-auto p-2">
              {isLoadingList ? (
                <LoadingState label="Loading files" />
              ) : filteredFiles.length > 0 ? (
                <FileTree
                  node={tree}
                  onSelect={(path) => {
                    setHighlightRange(null);
                    setSelectedPath(path);
                  }}
                  selectedPath={selectedPath}
                />
              ) : (
                <EmptyState label="No files match this search." />
              )}
            </div>
          </aside>

          <div className="min-w-0">
            {error ? (
              <div className="p-4">
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Unable to load file</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            ) : isLoadingFile ? (
              <LoadingState label="Opening file" />
            ) : selectedFile ? (
              <FileViewer file={selectedFile} highlightRange={highlightRange} />
            ) : (
              <EmptyState label="Select a file to preview it." />
            )}
          </div>
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
    <div className={cn(depth === 0 ? "space-y-0.5" : "space-y-0.5")}>
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
              "flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
              selectedPath === file.path &&
                "bg-primary/10 text-primary hover:bg-primary/10",
            )}
            key={file.path}
            onClick={() => onSelect(file.path)}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
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
  file,
  highlightRange,
}: {
  file: RepoFileDetail;
  highlightRange: { endLine?: number; startLine?: number } | null;
}) {
  const lines = splitLines(file.content ?? "");
  const hasContent =
    typeof file.content === "string" && file.content.length > 0;
  const highlightedLineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!highlightRange?.startLine) return;

    highlightedLineRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [highlightRange]);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0 space-y-1">
          <h3 className="break-all font-medium text-sm">{file.path}</h3>
          {file.summary ? (
            <p className="text-muted-foreground text-sm leading-6">
              {file.summary}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {file.language ? (
            <Badge variant="outline">{file.language}</Badge>
          ) : null}
          <Badge variant="outline">{formatBytes(file.sizeBytes)}</Badge>
          {file.sha ? (
            <Badge variant="secondary">{file.sha.slice(0, 7)}</Badge>
          ) : null}
        </div>
      </div>

      {file.isBinary ? (
        <FileNotice
          title="Binary file"
          description="RepoMind saved this file as binary, so it cannot be previewed as text."
        />
      ) : file.skippedReason ? (
        <FileNotice title="Skipped file" description={file.skippedReason} />
      ) : hasContent ? (
        <div className="max-h-125 overflow-auto bg-muted/15">
          <pre className="min-w-full p-0 font-mono text-xs leading-5">
            {lines.map((line, index) => (
              <CodeLine
                index={index}
                isHighlighted={isLineHighlighted(index + 1, highlightRange)}
                key={`${file.path}-${index}`}
                line={line}
                ref={
                  highlightRange?.startLine === index + 1
                    ? highlightedLineRef
                    : undefined
                }
              />
            ))}
          </pre>
        </div>
      ) : (
        <FileNotice
          title="No saved content"
          description="RepoMind has metadata for this file, but GitHub did not return source content for the saved commit."
        />
      )}
    </div>
  );
}

function CodeLine({
  index,
  isHighlighted,
  line,
  ref,
}: {
  index: number;
  isHighlighted: boolean;
  line: string;
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[4rem_minmax(0,1fr)] border-b border-border/40",
        isHighlighted && "bg-primary/10",
      )}
      id={`file-line-${index + 1}`}
      ref={ref}
    >
      <span className="select-none border-r bg-muted/30 px-3 py-0.5 text-right text-muted-foreground">
        {index + 1}
      </span>
      <code className="min-w-0 overflow-x-auto px-3 py-0.5 whitespace-pre">
        {line || " "}
      </code>
    </div>
  );
}

function isLineHighlighted(
  lineNumber: number,
  range: { endLine?: number; startLine?: number } | null,
) {
  if (!range?.startLine) return false;

  const endLine = range.endLine ?? range.startLine;
  return lineNumber >= range.startLine && lineNumber <= endLine;
}

function FileNotice({
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

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-2 text-muted-foreground text-sm">
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

function splitLines(content: string) {
  return content.replace(/\r\n/g, "\n").split("\n");
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
