import { useEffect, useMemo, useRef, forwardRef, useImperativeHandle, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import {
  getForegroundColor, getNodeColor, getStatusColor, nodeRadius,
  RELATION_STYLES, getEdgeColor, getPrimaryColor, getBackgroundColor, withAlpha,
} from "./graphColors";
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

/** Resolve once per render call so theme-toggling is reflected without remount. */
function resolveThemeTokens() {
  return {
    labelColor: getForegroundColor(),
    primaryColor: getPrimaryColor(),
    // Theme background, painted as a soft outline under label text — gives
    // legibility over nodes/edges without the old opaque "backing pill" box.
    haloColor: getBackgroundColor(),
  };
}

/** Show labels only when zoomed in past this scale; below it, labels appear
 *  on hover/selection only — keeps the canvas de-cluttered at overview zoom. */
const LABEL_ZOOM_THRESHOLD = 1.4;

/** Whether the user prefers reduced motion. */
function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
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
    if (!fg || typeof fg.d3Force !== "function") return;
    fg.d3VelocityDecay?.(0.3);
    fg.d3Force("charge")?.strength?.(forces.charge);
    const link = fg.d3Force("link");
    link?.distance?.(forces.linkDistance);
    link?.strength?.(forces.linkStrength);
    fg.d3Force("center")?.strength?.(forces.center);
    fg.d3ReheatSimulation?.();
  }, [forces, fgData]);

  // Perf: freeze layout sooner as the graph grows; offload to worker past ~800 nodes.
  const n = data.nodes.length;
  // Reduce animation ticks for prefers-reduced-motion
  const reducedMotion = prefersReducedMotion();
  const cooldownTicks = reducedMotion ? 50 : (n > 500 ? 80 : n > 200 ? 120 : 200);
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
        return getEdgeColor(active);
      }}
      linkLineDash={(l: GraphEdge) => RELATION_STYLES[l.type]?.dash ?? null}
      linkWidth={(l: GraphEdge) => RELATION_STYLES[l.type]?.weight ?? 1}
      linkDirectionalArrowLength={5}
      linkDirectionalArrowRelPos={0.92}
      linkDirectionalArrowColor={(l: GraphEdge) => {
        const [s, t] = edgeEnds(l);
        const active = !highlightedSet || (highlightedSet.has(s) && highlightedSet.has(t));
        return getEdgeColor(active);
      }}
      nodeCanvasObject={(node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        const r = nodeRadius(node.__deg ?? 0, forces.nodeSize);
        const dimmed = highlightedSet ? !highlightedSet.has(node.id) : false;
        const isSelected = node.id === selectedId;
        const isHovered = node.id === hoverId;

        // Resolve theme tokens per frame (cheap string lookup; handles live theme toggle)
        const { labelColor, primaryColor, haloColor } = resolveThemeTokens();

        ctx.globalAlpha = dimmed ? 0.15 : 1;

        // Drop shadow / halo for depth — only on non-dimmed nodes
        if (!dimmed) {
          ctx.save();
          ctx.shadowColor = node.__color ?? "hsl(220,12%,50%)";
          ctx.shadowBlur = isSelected || isHovered ? 14 / globalScale : 6 / globalScale;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        // Body — color by type
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = node.__color ?? "hsl(220,12%,50%)";
        ctx.fill();

        if (!dimmed) {
          ctx.restore(); // clear shadow for rings/labels
        }

        // Selection ring (primary color, thick)
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(x, y, r + 3.5 / globalScale, 0, 2 * Math.PI);
          ctx.lineWidth = 2.5 / globalScale;
          ctx.strokeStyle = primaryColor;
          ctx.stroke();
          // Outer glow ring
          ctx.beginPath();
          ctx.arc(x, y, r + 6.5 / globalScale, 0, 2 * Math.PI);
          ctx.lineWidth = 1 / globalScale;
          ctx.strokeStyle = withAlpha("--primary", 0.28, "347, 84%, 42%");
          ctx.stroke();
        } else if (isHovered) {
          // Hover ring — slightly smaller, primary color
          ctx.beginPath();
          ctx.arc(x, y, r + 2.5 / globalScale, 0, 2 * Math.PI);
          ctx.lineWidth = 1.8 / globalScale;
          ctx.strokeStyle = withAlpha("--primary", 0.7, "347, 84%, 42%");
          ctx.stroke();
        } else if (node.__border) {
          // Status ring
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 2 * Math.PI);
          ctx.lineWidth = Math.max(1.5, r * 0.28);
          ctx.strokeStyle = node.__border;
          ctx.stroke();
        }

        // Label — de-cluttered: shown only when zoomed in past the threshold,
        // OR when this node is the focus (hover/selection/highlight). No backing
        // box: a soft background-colored halo keeps the text legible over edges.
        const inFocus = isSelected || isHovered ||
          (highlightedSet ? highlightedSet.has(node.id) && !dimmed : false);
        if (globalScale >= LABEL_ZOOM_THRESHOLD || inFocus) {
          const fontSize = Math.max(9, 11 / globalScale);
          ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
          const label = node.label?.length > 22 ? node.label.slice(0, 22) + "…" : (node.label ?? "");
          const ly = y + r + 4 / globalScale + fontSize / 2;

          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // Halo: a thick, rounded outline in the canvas background colour drawn
          // under the fill — readable text without an opaque pill.
          ctx.lineJoin = "round";
          ctx.miterLimit = 2;
          ctx.lineWidth = 3 / globalScale;
          ctx.strokeStyle = haloColor;
          ctx.strokeText(label, x, ly);

          ctx.fillStyle = isSelected || isHovered ? primaryColor : labelColor;
          ctx.fillText(label, x, ly);
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
