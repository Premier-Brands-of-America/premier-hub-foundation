import { useEffect, useMemo, useRef, forwardRef, useImperativeHandle, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import {
  getForegroundColor, getNodeColor, getStatusColor, nodeRadius,
  RELATION_STYLES, getEdgeColor, getPrimaryColor, getCardColor, withAlpha,
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
    // Card surface for the subtle, translucent label backplate.
    cardColor: getCardColor(),
  };
}

/** Append an alpha to a resolved `hsl(H S% L%)` string → `hsl(H S% L% / a)`.
 *  Node/token colors resolve space-separated at runtime, so the modern slash
 *  syntax is valid. */
function fade(hsl: string, alpha: number): string {
  return hsl.replace(/\)\s*$/, ` / ${alpha})`);
}

/** Trace a rounded-rect path (arcTo — universally supported/typed). */
function roundRectPath(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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
      /* Subtle "alive" drift — crimson particles only on edges within the
         focused (hover/selected) neighbourhood; none at rest, none for
         reduced-motion. Keeps the overview calm and performance-safe. */
      linkDirectionalParticles={(l: GraphEdge) => {
        if (reducedMotion || !highlightedSet) return 0;
        const [s, t] = edgeEnds(l);
        return highlightedSet.has(s) && highlightedSet.has(t) ? 2 : 0;
      }}
      linkDirectionalParticleSpeed={0.005}
      linkDirectionalParticleWidth={2}
      linkDirectionalParticleColor={() => withAlpha("--primary", 0.8, "347 84% 42%")}
      nodeCanvasObject={(node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        const r = nodeRadius(node.__deg ?? 0, forces.nodeSize);
        const dimmed = highlightedSet ? !highlightedSet.has(node.id) : false;
        const isSelected = node.id === selectedId;
        const isHovered = node.id === hoverId;

        // Resolve theme tokens per frame (cheap string lookup; handles live theme toggle)
        const { labelColor, primaryColor, cardColor } = resolveThemeTokens();
        const color = node.__color ?? "hsl(220 12% 50%)";
        const isFocus = isSelected || isHovered;

        ctx.globalAlpha = dimmed ? 0.12 : 1;

        // 0. Glow bloom — real shadowBlur so nodes read as a glowing
        //    constellation (the NexoString signature). Cheap at this node count.
        ctx.save();
        ctx.shadowColor = fade(color, 0.95);
        ctx.shadowBlur = isFocus ? 30 : 20;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = fade(color, isFocus ? 1 : 0.9);
        ctx.fill();
        ctx.restore();

        // 1. Soft translucent halo disc behind the body.
        ctx.beginPath();
        ctx.arc(x, y, r + (isFocus ? 12 : 8) / globalScale, 0, 2 * Math.PI);
        ctx.fillStyle = fade(color, isFocus ? 0.34 : 0.22);
        ctx.fill();

        // 2. Body — translucent fill + crisp stroke in the entity color.
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = fade(color, 0.96);
        ctx.fill();
        ctx.lineWidth = (isFocus ? 1.8 : 1.2) / globalScale;
        ctx.strokeStyle = color;
        ctx.stroke();

        // 3. Status ring — thin accent just outside the body when status known.
        if (node.__border && !isSelected) {
          ctx.beginPath();
          ctx.arc(x, y, r + 2 / globalScale, 0, 2 * Math.PI);
          ctx.lineWidth = 1.5 / globalScale;
          ctx.strokeStyle = node.__border;
          ctx.stroke();
        }

        // 4. Selection / hover ring — Premier crimson, the focus accent.
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(x, y, r + 4.5 / globalScale, 0, 2 * Math.PI);
          ctx.lineWidth = 2 / globalScale;
          ctx.strokeStyle = primaryColor;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, y, r + 7 / globalScale, 0, 2 * Math.PI);
          ctx.lineWidth = 1 / globalScale;
          ctx.strokeStyle = withAlpha("--primary", 0.25, "347 84% 42%");
          ctx.stroke();
        } else if (isHovered) {
          ctx.beginPath();
          ctx.arc(x, y, r + 3.5 / globalScale, 0, 2 * Math.PI);
          ctx.lineWidth = 1.6 / globalScale;
          ctx.strokeStyle = withAlpha("--primary", 0.7, "347 84% 42%");
          ctx.stroke();
        }

        // 5. Label — de-cluttered (zoom threshold OR focus) with a SUBTLE
        //    translucent card backplate, not an opaque box.
        const inFocus = isFocus ||
          (highlightedSet ? highlightedSet.has(node.id) && !dimmed : false);
        if (globalScale >= LABEL_ZOOM_THRESHOLD || inFocus) {
          const fontSize = Math.max(9, 11 / globalScale);
          ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
          const label = node.label?.length > 22 ? node.label.slice(0, 22) + "…" : (node.label ?? "");
          const padX = 4 / globalScale;
          const padY = 2 / globalScale;
          const tw = ctx.measureText(label).width;
          const bpW = tw + padX * 2;
          const bpH = fontSize + padY * 2;
          const bpX = x - bpW / 2;
          const bpY = y + r + 5 / globalScale;

          roundRectPath(ctx, bpX, bpY, bpW, bpH, 3 / globalScale);
          ctx.fillStyle = fade(cardColor, 0.7);
          ctx.fill();

          ctx.fillStyle = isFocus ? primaryColor : labelColor;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, x, bpY + bpH / 2);
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
