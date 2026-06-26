import { useEffect, useMemo, useRef, forwardRef, useImperativeHandle, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { getForegroundColor, getNodeColor, getStatusColor, nodeRadius, RELATION_STYLES } from "./graphColors";
import { DEFAULT_FORCES, type GraphEdge, type GraphForces, type GraphNode, type GraphPayload } from "@/types/graph";

export interface GraphCanvasHandle {
  zoomToFit: () => void;
  zoomBy: (factor: number) => void;
  centerOnNode: (id: string) => void;
  exportPng: () => string | null;
}

interface Props {
  data: GraphPayload;
  selectedId?: string | null;
  highlightIds?: Set<string>;
  forces?: GraphForces;
  onNodeClick: (n: GraphNode) => void;
  onNodeHover?: (n: GraphNode | null) => void;
  width: number;
  height: number;
}

type FGNode = GraphNode & { __color?: string; __border?: string | null; __deg?: number };
type FGData = { nodes: FGNode[]; links: GraphEdge[] };

function edgeEnds(e: GraphEdge): [string, string] {
  const s = typeof e.source === "string" ? e.source : (e.source as unknown as GraphNode).id;
  const t = typeof e.target === "string" ? e.target : (e.target as unknown as GraphNode).id;
  return [s, t];
}

export const GraphCanvas = forwardRef<GraphCanvasHandle, Props>(function GraphCanvas(
  { data, selectedId, highlightIds, forces = DEFAULT_FORCES, onNodeClick, onNodeHover, width, height }, ref,
) {
  const fgRef = useRef<ForceGraphMethods<FGNode, GraphEdge>>();
  const [hoverId, setHoverId] = useState<string | null>(null);

  // degree per node (drives area-proportional sizing)
  const degree = useMemo(() => {
    const d = new Map<string, number>();
    for (const e of data.edges) {
      const [s, t] = edgeEnds(e);
      d.set(s, (d.get(s) ?? 0) + 1);
      d.set(t, (d.get(t) ?? 0) + 1);
    }
    return d;
  }, [data.edges]);

  // Stable graphData reference: mutate in place when ids match to preserve positions
  const fgDataRef = useRef<FGData>({ nodes: [], links: [] });
  const fgData = useMemo<FGData>(() => {
    const prev = fgDataRef.current;
    const prevById = new Map(prev.nodes.map((n) => [n.id, n]));
    const nextNodes: FGNode[] = data.nodes.map((n) => {
      const existing = prevById.get(n.id);
      const base = existing ? (Object.assign(existing, n), existing) : { ...n };
      base.__color = getNodeColor(n.type);
      base.__border = getStatusColor(n.status);
      base.__deg = degree.get(n.id) ?? 0;
      return base;
    });
    const next: FGData = { nodes: nextNodes, links: data.edges.map((e) => ({ ...e })) };
    fgDataRef.current = next;
    return next;
  }, [data, degree]);

  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of data.edges) {
      const [s, t] = edgeEnds(e);
      if (!map.has(s)) map.set(s, new Set());
      if (!map.has(t)) map.set(t, new Set());
      map.get(s)!.add(t);
      map.get(t)!.add(s);
    }
    return map;
  }, [data.edges]);

  const highlightedSet = useMemo(() => {
    if (highlightIds && highlightIds.size > 0) return highlightIds;
    const active = hoverId ?? selectedId ?? null;
    if (!active) return null;
    const set = new Set<string>([active]);
    neighbors.get(active)?.forEach((id) => set.add(id));
    return set;
  }, [hoverId, selectedId, neighbors, highlightIds]);

  useImperativeHandle(ref, () => ({
    zoomToFit: () => fgRef.current?.zoomToFit(600, 40),
    zoomBy: (factor: number) => {
      const z = fgRef.current?.zoom() ?? 1;
      fgRef.current?.zoom(z * factor, 300);
    },
    centerOnNode: (id: string) => {
      const n = fgData.nodes.find((x) => x.id === id);
      if (n && typeof n.x === "number" && typeof n.y === "number") {
        fgRef.current?.centerAt(n.x, n.y, 600);
        fgRef.current?.zoom(2.5, 600);
      }
    },
    exportPng: () => {
      const canvas = (fgRef.current as unknown as { canvas?: () => HTMLCanvasElement } | undefined)?.canvas?.();
      return canvas?.toDataURL("image/png") ?? null;
    },
  }));

  // Apply force tuning and reheat whenever sliders or data change.
  useEffect(() => {
    const fg = fgRef.current as unknown as {
      d3Force?: (n: string) => { strength?: (v: number) => void; distance?: (v: number) => void } | undefined;
      d3VelocityDecay?: (v: number) => void;
      d3ReheatSimulation?: () => void;
    } | undefined;
    // react-force-graph wires its imperative methods onto the ref a tick after
    // first mount, so they can be absent on the initial effect run — calling them
    // unguarded crashes the page. Guard on readiness (d3Force as the sentinel);
    // this effect re-runs when graph data loads, applying the tuning once ready.
    if (!fg || typeof fg.d3Force !== "function") return;
    fg.d3VelocityDecay?.(0.3);
    fg.d3Force("charge")?.strength?.(forces.charge);
    const link = fg.d3Force("link");
    link?.distance?.(forces.linkDistance);
    link?.strength?.(forces.linkStrength);
    fg.d3Force("center")?.strength?.(forces.center);
    fg.d3ReheatSimulation?.();
  }, [forces, fgData]);

  // Resolve once per render so it tracks theme toggles.
  const labelColor = getForegroundColor();

  // Perf: freeze layout sooner as the graph grows; offload to worker past ~800 nodes.
  const n = data.nodes.length;
  const cooldownTicks = n > 500 ? 80 : n > 200 ? 120 : 200;
  const useWorker = n > 800;
  const FG = ForceGraph2D as unknown as React.ComponentType<Record<string, unknown>>;

  return (
    <FG
      ref={fgRef}
      width={width}
      height={height}
      graphData={fgData}
      cooldownTicks={cooldownTicks}
      nodeRelSize={forces.nodeSize}
      nodeVal={(node: FGNode) => (node.__deg ?? 0) + 1}
      useWorkerForCalc={useWorker}
      onNodeClick={(node: FGNode) => onNodeClick(node)}
      onNodeHover={(node: FGNode | null) => {
        setHoverId(node?.id ?? null);
        onNodeHover?.(node ?? null);
      }}
      onNodeDragEnd={(node: FGNode) => {
        node.fx = node.x;
        node.fy = node.y;
      }}
      linkColor={(l: GraphEdge) => {
        const [s, t] = edgeEnds(l);
        const active = !highlightedSet || (highlightedSet.has(s) && highlightedSet.has(t));
        return active ? "rgba(120,120,120,0.55)" : "rgba(120,120,120,0.10)";
      }}
      linkLineDash={(l: GraphEdge) => RELATION_STYLES[l.type]?.dash ?? null}
      linkWidth={(l: GraphEdge) => RELATION_STYLES[l.type]?.weight ?? 1}
      linkDirectionalArrowLength={4}
      linkDirectionalArrowRelPos={0.95}
      nodeCanvasObject={(node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        const r = nodeRadius(node.__deg ?? 0, forces.nodeSize);
        const dimmed = highlightedSet ? !highlightedSet.has(node.id) : false;
        ctx.globalAlpha = dimmed ? 0.18 : 1;

        // Body — color by type
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = node.__color ?? "hsl(220,12%,50%)";
        ctx.fill();

        // Border — tint by status (selection ring overrides)
        if (node.id === selectedId) {
          ctx.lineWidth = 2.5 / globalScale;
          ctx.strokeStyle = "#fff";
          ctx.stroke();
        } else if (node.__border) {
          ctx.lineWidth = Math.max(1.5, r * 0.28);
          ctx.strokeStyle = node.__border;
          ctx.stroke();
        }

        // Label — only when zoomed in enough to be legible
        if (globalScale >= 1.2) {
          const fontSize = 11 / globalScale;
          ctx.font = `${fontSize}px sans-serif`;
          ctx.fillStyle = labelColor;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          const label = node.label?.length > 18 ? node.label.slice(0, 18) + "…" : (node.label ?? "");
          ctx.fillText(label, x, y + r + 2 / globalScale);
        }
        ctx.globalAlpha = 1;
      }}
      nodePointerAreaPaint={(node: FGNode, color: string, ctx: CanvasRenderingContext2D) => {
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        const r = nodeRadius(node.__deg ?? 0, forces.nodeSize);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r + 2, 0, 2 * Math.PI);
        ctx.fill();
      }}
    />
  );
});
