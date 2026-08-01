"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  MiniMap,
  type Node,
  type NodeProps,
  type NodeTypes,
  Panel,
  Position,
  ReactFlow,
} from "@xyflow/react";
import {
  Bot,
  Braces,
  Database,
  FileCode2,
  Maximize2,
  Minimize2,
  Network,
  Route,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RepositoryAnalysis, SourceCitation } from "@/lib/analysis-types";
import { cn } from "@/lib/utils";

type RepoDiagramProps = {
  analysis: RepositoryAnalysis;
};

type RepoFlowNodeData = {
  citation?: SourceCitation;
  detail?: string;
  index: number;
  label: string;
  tone: "api" | "data" | "ai" | "source" | "default";
};

type RepoFlowNode = Node<RepoFlowNodeData, "repoNode">;
type RepoFlowEdge = Edge<{ label?: string }>;

const nodeTypes = {
  repoNode: RepoFlowNodeView,
} satisfies NodeTypes;

export const RepoDiagram = ({ analysis }: RepoDiagramProps) => {
  const { nodes, edges } = analysis.diagram;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    nodes[0]?.id ?? null,
  );
  const { flowEdges, flowNodes } = useMemo(
    () => buildFlowElements({ edges, nodes }),
    [edges, nodes],
  );
  const selectedNode =
    flowNodes.find((node) => node.id === selectedNodeId) ??
    flowNodes[0] ??
    null;

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
        "overflow-hidden rounded-lg border bg-background shadow-sm",
        isFullscreen && "fixed inset-4 z-50 bg-background shadow-2xl",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background/95 p-3">
        <div className="min-w-0">
          <p className="font-medium text-sm">Interactive architecture flow</p>
          <p className="text-muted-foreground text-xs">
            Pan, zoom, drag nodes, inspect relationships, and open cited files.
          </p>
        </div>
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

      <div
        className={cn(
          "h-[680px] bg-muted/10",
          isFullscreen && "h-[calc(100vh-7.5rem)]",
        )}
      >
        <ReactFlow<RepoFlowNode, RepoFlowEdge>
          className="repo-flow"
          colorMode="dark"
          defaultEdgeOptions={{
            markerEnd: {
              color: "var(--primary)",
              type: MarkerType.ArrowClosed,
            },
            style: {
              stroke: "var(--primary)",
              strokeOpacity: 0.55,
              strokeWidth: 2,
            },
          }}
          edges={flowEdges}
          fitView
          fitViewOptions={{ padding: 0.22 }}
          maxZoom={1.7}
          minZoom={0.35}
          nodeTypes={nodeTypes}
          nodes={flowNodes}
          nodesConnectable={false}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          panOnScroll
        >
          <Background
            color="var(--border)"
            gap={22}
            size={1}
            variant={BackgroundVariant.Dots}
          />
          <Controls className="overflow-hidden rounded-lg border bg-background shadow-sm" />
          <MiniMap
            className="overflow-hidden rounded-lg border bg-background"
            maskColor="oklch(0.145 0 0 / 45%)"
            nodeBorderRadius={8}
            nodeColor={(node) => getMiniMapColor(node as RepoFlowNode)}
            pannable
            position="bottom-right"
            zoomable
          />
          <Panel position="top-left">
            <div className="rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{flowNodes.length} nodes</Badge>
                <Badge variant="outline">{flowEdges.length} edges</Badge>
              </div>
            </div>
          </Panel>
          {selectedNode ? (
            <Panel position="top-right">
              <NodeInspector node={selectedNode} />
            </Panel>
          ) : null}
        </ReactFlow>
      </div>
    </div>
  );
};

function RepoFlowNodeView({ data, selected }: NodeProps<RepoFlowNode>) {
  const Icon = getNodeIcon(data.tone);

  return (
    <div
      className={cn(
        "w-64 rounded-lg border bg-background p-3 text-foreground shadow-sm transition-colors",
        selected && "border-primary shadow-md shadow-primary/10",
      )}
    >
      <Handle className="!bg-primary" position={Position.Left} type="target" />
      <div className="mb-2 flex items-start gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border",
            getToneClass(data.tone),
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              0{data.index + 1}
            </span>
            {data.citation ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs">
                cited
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-medium text-sm leading-5">{data.label}</p>
        </div>
      </div>
      {data.detail ? (
        <p className="line-clamp-3 text-muted-foreground text-xs leading-5">
          {data.detail}
        </p>
      ) : null}
      <Handle className="!bg-primary" position={Position.Right} type="source" />
    </div>
  );
}

function NodeInspector({ node }: { node: RepoFlowNode }) {
  const citation = node.data.citation;

  return (
    <div className="w-80 rounded-lg border bg-background/95 p-4 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-start gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border",
            getToneClass(node.data.tone),
          )}
        >
          <Network className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm">{node.data.label}</p>
          <p className="mt-1 text-muted-foreground text-xs leading-5">
            {node.data.detail ?? "Generated architecture node."}
          </p>
        </div>
      </div>

      {citation ? (
        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-muted-foreground text-xs">Citation</p>
            <p className="mt-1 break-all font-medium text-sm">
              {citation.path}
            </p>
            {citation.startLine ? (
              <p className="mt-1 text-muted-foreground text-xs">
                lines {formatLineRange(citation)}
              </p>
            ) : null}
          </div>
          <Button
            className="w-full"
            onClick={() => openCitation(citation)}
            size="sm"
            type="button"
          >
            <FileCode2 />
            Open cited file
          </Button>
        </div>
      ) : (
        <p className="rounded-lg border bg-muted/20 p-3 text-muted-foreground text-xs leading-5">
          No direct file citation was generated for this node.
        </p>
      )}
    </div>
  );
}

function buildFlowElements(input: {
  edges: RepositoryAnalysis["diagram"]["edges"];
  nodes: RepositoryAnalysis["diagram"]["nodes"];
}) {
  const positions = buildLayeredLayout(input.nodes, input.edges);
  const flowNodes: RepoFlowNode[] = input.nodes.map((node, index) => ({
    data: {
      citation: node.citation,
      detail: node.detail,
      index,
      label: node.label,
      tone: getNodeTone(node),
    },
    id: node.id,
    position: positions.get(node.id) ?? { x: index * 280, y: 0 },
    type: "repoNode",
  }));
  const nodeIds = new Set(flowNodes.map((node) => node.id));
  const flowEdges: RepoFlowEdge[] = input.edges
    .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
    .map((edge, index) => ({
      animated: index < 3,
      data: { label: edge.label },
      id: `${edge.from}-${edge.to}-${edge.label ?? index}`,
      label: edge.label,
      labelBgBorderRadius: 8,
      labelBgPadding: [8, 4],
      labelBgStyle: {
        fill: "var(--background)",
        fillOpacity: 0.92,
      },
      labelStyle: {
        fill: "var(--muted-foreground)",
        fontSize: 12,
        fontWeight: 500,
      },
      source: edge.from,
      target: edge.to,
      type: "smoothstep",
    }));

  return { flowEdges, flowNodes };
}

function buildLayeredLayout(
  nodes: RepositoryAnalysis["diagram"]["nodes"],
  edges: RepositoryAnalysis["diagram"]["edges"],
) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const incoming = new Map<string, string[]>();
  const depth = new Map<string, number>();

  for (const node of nodes) {
    incoming.set(node.id, []);
    depth.set(node.id, 0);
  }

  for (const edge of edges) {
    if (!(nodeIds.has(edge.from) && nodeIds.has(edge.to))) continue;
    incoming.get(edge.to)?.push(edge.from);
  }

  for (let pass = 0; pass < nodes.length; pass += 1) {
    for (const node of nodes) {
      const parents = incoming.get(node.id) ?? [];
      if (parents.length === 0) continue;
      const parentDepth = Math.max(
        ...parents.map((parentId) => depth.get(parentId) ?? 0),
      );
      depth.set(node.id, Math.max(depth.get(node.id) ?? 0, parentDepth + 1));
    }
  }

  const layers = new Map<number, string[]>();
  for (const node of nodes) {
    const nodeDepth = depth.get(node.id) ?? 0;
    layers.set(nodeDepth, [...(layers.get(nodeDepth) ?? []), node.id]);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const xGap = 330;
  const yGap = 155;

  for (const [layer, ids] of layers) {
    const topOffset = -((ids.length - 1) * yGap) / 2;
    ids.forEach((id, index) => {
      positions.set(id, {
        x: layer * xGap,
        y: topOffset + index * yGap,
      });
    });
  }

  return positions;
}

function getNodeTone(
  node: RepositoryAnalysis["diagram"]["nodes"][number],
): RepoFlowNodeData["tone"] {
  const text = `${node.label} ${node.detail ?? ""}`.toLowerCase();

  if (/api|route|request|handler|controller/.test(text)) return "api";
  if (/data|db|database|prisma|store|persist|model/.test(text)) return "data";
  if (/ai|chat|report|analysis|llm|model/.test(text)) return "ai";
  if (/file|source|component|page|ui|view/.test(text)) return "source";
  return "default";
}

function getNodeIcon(tone: RepoFlowNodeData["tone"]) {
  if (tone === "api") return Route;
  if (tone === "data") return Database;
  if (tone === "ai") return Bot;
  if (tone === "source") return Braces;
  return Network;
}

function getToneClass(tone: RepoFlowNodeData["tone"]) {
  if (tone === "api") return "border-sky-500/30 bg-sky-500/10 text-sky-400";
  if (tone === "data") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }
  if (tone === "ai") {
    return "border-violet-500/30 bg-violet-500/10 text-violet-400";
  }
  if (tone === "source") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  }
  return "border-primary/30 bg-primary/10 text-primary";
}

function getMiniMapColor(node: RepoFlowNode) {
  if (node.data.tone === "api") return "oklch(0.685 0.169 237.323)";
  if (node.data.tone === "data") return "oklch(0.696 0.17 162.48)";
  if (node.data.tone === "ai") return "oklch(0.627 0.265 303.9)";
  if (node.data.tone === "source") return "oklch(0.769 0.188 70.08)";
  return "var(--primary)";
}

function openCitation(citation: SourceCitation) {
  window.dispatchEvent(
    new CustomEvent("repomind:open-file", {
      detail: {
        endLine: citation.endLine,
        path: citation.path,
        startLine: citation.startLine,
      },
    }),
  );

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.getElementById("files")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  });
}

function formatLineRange(citation: SourceCitation) {
  if (!citation.startLine) return "unknown";
  if (!citation.endLine || citation.endLine === citation.startLine) {
    return `${citation.startLine}`;
  }

  return `${citation.startLine}-${citation.endLine}`;
}
