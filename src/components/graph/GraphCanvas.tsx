import { useEffect, useMemo, useRef, forwardRef, useImperativeHandle, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { getNodeColor, RELATION_STYLES } from "./graphColors";
import type { GraphEdge, GraphNode, GraphPayload } from "@/types/graph";

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
  onNodeClick: (n: GraphNode) => void;
  onNodeHover?: (n: GraphNode | null) => void;
  width: number;
  height: number;
}

type FGNode = GraphNode & { __color?: string };
type FGData = { nodes: FGNode[]; links: GraphEdge[] };

export const GraphCanvas = forwardRef<GraphCanvasHandle, Props>(function GraphCanvas(
  { data, selectedId, highlightIds, onNodeClick, onNodeHover, width, height }, ref,
) {
  const fgRef = useRef<ForceGraphMethods<FGNode, GraphEdge>>();
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Stable graphData reference: mutate in place when ids match to preserve positions
  const fgDataRef = useRef<FGData>({ nodes: [], links: [] });
  const fgData = useMemo<FGData>(() => {
    const prev = fgDataRef.current;
    const prevById = new Map(prev.nodes.map((n) => [n.id, n]));
    const nextNodes: FGNode[] = data.nodes.map((n) => {
      const existing = prevById.get(n.id);
      if (existing) {
        Object.assign(existing, n);
        return existing;
      }
      return { ...n };
    });
    const next: FGData = { nodes: nextNodes, links: data.edges.map((e) => ({ ...e })) };
    fgDataRef.current = next;
    return next;
  }, [data]);

  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of data.edges) {
      const s = typeof e.source === "string" ? e.source : (e.source as unknown as GraphNode).id;
      const t = typeof e.target === "string" ? e.target : (e.target as unknown as GraphNode).id;
      if (!map.has(s)) map.set(s, new Set());
      if (!map.has(t)) map.set(t, new Set());
      map.get(s)!.add(t);
      map.get(t)!.add(s);
    }
    return map;
  }, [data.edges]);

  const highlightedSet = useMemo(() => {
    const active = hoverId ?? selectedId ?? null;
    if (highlightIds && highlightIds.size > 0) return highlightIds;
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

  useEffect(() => {
    fgRef.current?.d3Force("charge")?.strength(-180);
    const linkF = fgRef.current?.d3Force("link") as { distance: (n: number) => void } | undefined;
    linkF?.distance(70);
  }, [fgData]);

  const useWorker = data.nodes.length > 800;

  return (
    <ForceGraph2D
      ref={fgRef as never}
      width={width}
      height={height}
      graphData={fgData}
      cooldownTicks={150}
      useWorkerForCalc={useWorker}
      onNodeClick={(n) => onNodeClick(n as FGNode)}
      onNodeHover={(n) => {
        const node = n as FGNode | null;
        setHoverId(node?.id ?? null);
        onNodeHover?.(node ?? null);
      }}
      onNodeDragEnd={(n) => {
        const node = n as FGNode;
        node.fx = node.x;
        node.fy = node.y;
      }}
      linkColor={(l) => {
        const e = l as GraphEdge;
        const s = typeof e.source === "string" ? e.source : (e.source as unknown as GraphNode).id;
        const t = typeof e.target === "string" ? e.target : (e.target as unknown as GraphNode).id;
        const active = !highlightedSet || (highlightedSet.has(s) && highlightedSet.has(t));
        return active ? "rgba(120,120,120,0.55)" : "rgba(120,120,120,0.12)";
      }}
      linkLineDash={(l) => RELATION_STYLES[(l as GraphEdge).type]?.dash ?? null}
      linkWidth={(l) => RELATION_STYLES[(l as GraphEdge).type]?.weight ?? 1}
      linkDirectionalArrowLength={4}
      linkDirectionalArrowRelPos={0.95}
      nodeCanvasObject={(n, ctx, globalScale) => {
        const node = n as FGNode;
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        const color = node.__color ?? (node.__color = getNodeColor(node.type));
        const dimmed = highlightedSet ? !highlightedSet.has(node.id) : false;
        ctx.globalAlpha = dimmed ? 0.2 : 1;

        if (globalScale < 0.3) {
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.globalAlpha = 1;
          return;
        }

        const w = 120 / globalScale;
        const h = 36 / globalScale;
        const r = 8 / globalScale;
        ctx.fillStyle = color;
        roundRect(ctx, x - w / 2, y - h / 2, w, h, r);
        ctx.fill();

        if (node.id === selectedId) {
          ctx.lineWidth = 2 / globalScale;
          ctx.strokeStyle = "#fff";
          ctx.stroke();
        }

        if (globalScale >= 0.6) {
          ctx.fillStyle = "#fff";
          ctx.font = `${12 / globalScale}px sans-serif`;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          const label = node.label?.length > 14 ? node.label.slice(0, 14) + "…" : (node.label ?? "");
          ctx.fillText(label, x - w / 2 + 12 / globalScale, y);
        }
        ctx.globalAlpha = 1;
      }}
      nodePointerAreaPaint={(n, color, ctx) => {
        const node = n as FGNode;
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        ctx.fillStyle = color;
        roundRect(ctx, x - 60, y - 18, 120, 36, 8);
        ctx.fill();
      }}
    />
  );
});

function roundRect(
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