"use client";

import { Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { RepositoryAnalysis } from "@/lib/analysis-types";
import { cn } from "@/lib/utils";

type RepoDiagramProps = {
  analysis: RepositoryAnalysis;
};

type DiagramNodeLayout = RepositoryAnalysis["diagram"]["nodes"][number] & {
  x: number;
  y: number;
};

export const RepoDiagram = ({ analysis }: RepoDiagramProps) => {
  const { nodes, edges } = analysis.diagram;
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const layout = buildDiagramLayout(nodes);
  const nodeById = new Map(layout.map((node) => [node.id, node]));
  const visibleEdges = edges
    .map((edge) => ({
      ...edge,
      fromNode: nodeById.get(edge.from),
      toNode: nodeById.get(edge.to),
    }))
    .filter(
      (
        edge,
      ): edge is typeof edge & {
        fromNode: DiagramNodeLayout;
        toNode: DiagramNodeLayout;
      } => Boolean(edge.fromNode && edge.toNode),
    );

  if (nodes.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/20 p-6 text-muted-foreground text-sm">
        No diagram nodes were generated for this repository.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/20",
        isFullscreen &&
          "fixed inset-4 z-50 overflow-hidden bg-background shadow-2xl",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background/80 p-3">
        <div className="min-w-0">
          <p className="font-medium text-sm">Architecture diagram</p>
          <p className="text-muted-foreground text-xs">
            Zoom, inspect, and open cited files from nodes.
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            aria-label="Zoom out"
            onClick={() => setScale((value) => Math.max(0.7, value - 0.15))}
            size="icon"
            type="button"
            variant="outline"
          >
            <ZoomOut className="size-4" />
          </Button>
          <Button
            aria-label="Reset zoom"
            onClick={() => setScale(1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            aria-label="Zoom in"
            onClick={() => setScale((value) => Math.min(1.8, value + 0.15))}
            size="icon"
            type="button"
            variant="outline"
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            aria-label={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
            onClick={() => setIsFullscreen((value) => !value)}
            size="icon"
            type="button"
            variant="outline"
          >
            {isFullscreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </Button>
        </div>
      </div>
      <div
        className={cn(
          "relative min-h-115 w-full min-w-0 overflow-auto p-4",
          isFullscreen && "h-[calc(100%-4.5rem)] min-h-0",
        )}
      >
        <div
          className="relative min-h-115 origin-center transition-transform"
          style={{ transform: `scale(${scale})` }}
        >
          <svg
            aria-hidden="true"
            className="absolute inset-0 size-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <marker
                id="repo-diagram-arrow"
                markerHeight="6"
                markerWidth="6"
                orient="auto"
                refX="5"
                refY="3"
              >
                <path d="M0,0 L6,3 L0,6 Z" className="fill-muted-foreground" />
              </marker>
            </defs>
            {visibleEdges.map((edge) => (
              <path
                key={`${edge.from}-${edge.to}-${edge.label ?? "edge"}`}
                d={buildConnectorPath(edge.fromNode, edge.toNode)}
                className="fill-none stroke-muted-foreground/60"
                markerEnd="url(#repo-diagram-arrow)"
                strokeWidth="0.28"
              />
            ))}
          </svg>

          {layout.map((node, index) => (
            <button
              key={node.id}
              className={cn(
                "absolute flex min-h-20 w-36 -translate-x-1/2 -translate-y-1/2 flex-col justify-center rounded-lg border bg-background p-2.5 text-center shadow-sm transition-colors",
                node.citation && "hover:border-primary hover:text-primary",
              )}
              disabled={!node.citation}
              onClick={() => openNodeCitation(node)}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              type="button"
            >
              <div className="mb-1 flex items-center justify-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-md bg-primary/10 font-medium text-primary text-xs">
                  {index + 1}
                </span>
                <p className="font-medium text-sm leading-4">{node.label}</p>
              </div>
              {node.detail ? (
                <p className="line-clamp-2 text-muted-foreground text-xs leading-5">
                  {node.detail}
                </p>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

function openNodeCitation(node: DiagramNodeLayout) {
  if (!node.citation) return;

  window.dispatchEvent(
    new CustomEvent("repomind:open-file", {
      detail: {
        endLine: node.citation.endLine,
        path: node.citation.path,
        startLine: node.citation.startLine,
      },
    }),
  );

  document.getElementById("files")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function buildDiagramLayout(
  nodes: RepositoryAnalysis["diagram"]["nodes"],
): DiagramNodeLayout[] {
  const layouts: Array<Array<{ x: number; y: number }>> = [
    [{ x: 50, y: 50 }],
    [
      { x: 28, y: 50 },
      { x: 72, y: 50 },
    ],
    [
      { x: 22, y: 50 },
      { x: 50, y: 28 },
      { x: 78, y: 50 },
    ],
    [
      { x: 22, y: 32 },
      { x: 50, y: 24 },
      { x: 78, y: 32 },
      { x: 50, y: 76 },
    ],
    [
      { x: 22, y: 28 },
      { x: 50, y: 20 },
      { x: 78, y: 28 },
      { x: 66, y: 76 },
      { x: 34, y: 76 },
    ],
    [
      { x: 22, y: 24 },
      { x: 50, y: 18 },
      { x: 78, y: 24 },
      { x: 78, y: 70 },
      { x: 50, y: 82 },
      { x: 22, y: 70 },
    ],
  ];
  const positions =
    layouts[Math.min(Math.max(nodes.length, 1), layouts.length) - 1];

  return nodes.slice(0, positions.length).map((node, index) => ({
    ...node,
    ...positions[index],
  }));
}

function buildConnectorPath(from: DiagramNodeLayout, to: DiagramNodeLayout) {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}
