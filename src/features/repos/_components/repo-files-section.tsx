"use client";

import { AlertCircle, FileCode2, Folder, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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

type FileTreeNode = {
  children: Map<string, FileTreeNode>;
  file?: RepoFileListItem;
  name: string;
  path: string;
  type: "directory" | "file";
};

export const RepoFilesSection = ({ repoId }: RepoFilesSectionProps) => {
  const [files, setFiles] = useState<RepoFileListItem[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const structureFiles = useMemo(
    () => files.filter((file) => !isMarkdownPath(file.path)),
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
      if (isMarkdownPath(detail.path)) return;

      setQuery("");
      setActivePath(detail.path);
    };

    window.addEventListener("repomind:open-file", openFile);

    return () => {
      window.removeEventListener("repomind:open-file", openFile);
    };
  }, []);

  const filteredFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return structureFiles;

    return structureFiles.filter((file) =>
      file.path.toLowerCase().includes(normalizedQuery),
    );
  }, [structureFiles, query]);

  const tree = useMemo(() => buildFileTree(filteredFiles), [filteredFiles]);

  return (
    <section id="files" className="space-y-4 scroll-mt-24">
      <div className="space-y-1">
        <h2 className="font-semibold text-2xl tracking-normal">
          Folder structure
        </h2>
        <p className="text-muted-foreground text-sm leading-6">
          Browse the saved repository structure from analyzed files.
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <CardContent className="min-h-130 p-0">
          <aside className="bg-muted/15">
            <div className="space-y-3 border-b p-3">
              <div className="relative">
                <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search structure"
                  value={query}
                />
              </div>
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>{filteredFiles.length.toLocaleString()} visible</span>
                <span>{structureFiles.length.toLocaleString()} saved</span>
              </div>
            </div>

            <ScrollArea className="h-115 overflow-hidden **:data-[slot=scroll-area-scrollbar]:w-1.5 **:data-[slot=scroll-area-thumb]:bg-muted-foreground/25 **:data-[slot=scroll-area-thumb]:hover:bg-muted-foreground/45">
              <div className="p-2">
                {isLoadingList ? (
                  <LoadingState label="Loading structure" />
                ) : error ? (
                  <div className="p-2">
                    <Alert variant="destructive">
                      <AlertCircle className="size-4" />
                      <AlertTitle>Unable to load structure</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </div>
                ) : filteredFiles.length > 0 ? (
                  <FileTree
                    node={tree}
                    onSelect={(path) => {
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

function isMarkdownPath(path: string) {
  const normalizedPath = path.toLowerCase();
  return normalizedPath.endsWith(".md") || normalizedPath.endsWith(".mdx");
}
