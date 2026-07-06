import { useEffect, useMemo, useRef, forwardRef, useImperativeHandle, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import {
  getForegroundColor, getNodeColor, getStatusColor, nodeRadius,
  RELATION_STYLES, edgeDash, getCardColor,
  getSelectionColor, getHoverColor, getVoidColor, rawVar, getNodeColorRaw,
} from "./graphColors";
import { entityImageUri } from "@/lib/avatars/entityAvatars";
import { DEFAULT_FORCES, type GraphEdge, type GraphForces, type GraphNode, type GraphPayload, type NodeType } from "@/types/graph";

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

type FGNode = GraphNode & { __color?: string; __raw?: string; __border?: string | null; __deg?: number; __uri?: string | null };
type FGData = { nodes: FGNode[]; links: GraphEdge[] };

/** Entity types that render a real avatar/icon image inside the node circle.
 *  Persons get a portrait; projects & tasks get a seeded icon. Everything else
 *  falls back to the glowing colored disc. */
const IMAGE_TYPES = new Set<NodeType>(["user", "project", "task"]);
/** Degree at/above which a node earns the rotating orbital ring (a "hub"). */
const HUB_DEGREE = 4;
/** Constant edge curvature — both our drawn quadratic and the lib's particle
 *  path use this value so particles ride the visible curve. */
const EDGE_CURVATURE = 0.12;

function edgeEnds(e: GraphEdge): [string, string] {
  const s = typeof e.source === "string" ? e.source : (e.source as unknown as GraphNode).id;
  const t = typeof e.target === "string" ? e.target : (e.target as unknown as GraphNode).id;
  return [s, t];
}

/** Resolve theme tokens once per frame so a live theme toggle is reflected. */
function resolveThemeTokens() {
  return {
    labelColor: getForegroundColor(),
    selectionColor: getSelectionColor(),
    hoverColor: getHoverColor(),
    cardColor: getCardColor(),
    cyanRaw: rawVar("--signal-cyan-300", "349 85% 62%"),
    gridRaw: rawVar("--graph-grid", "228 12% 42%"),
  };
}

/** Append an alpha to a resolved `hsl(H S% L%)` string → `hsl(H S% L% / a)`. */
function fade(hsl: string, alpha: number): string {
  return hsl.replace(/\)\s*$/, ` / ${alpha})`);
}

/** Stable sine-bob so the constellation feels alive at rest ("respira"). */
function bob(id: string, now: number): { dx: number; dy: number } {
  if (!id) return { dx: 0, dy: 0 };
  const seed = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  const phase = (seed % 7) * 0.9;
  return {
    dx: Math.sin(now / 2400 + phase) * 1.1,
    dy: Math.cos(now / 3100 + phase) * 1.1,
  };
}

/** Show labels only past this zoom; below it, only focused nodes label. */
const LABEL_ZOOM_THRESHOLD = 1.4;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export const GraphCanvas = forwardRef<GraphCanvasHandle, Props>(function GraphCanvas(
  { data, selectedId, highlightIds, forces = DEFAULT_FORCES, onNodeClick, onNodeHover, width, height }, ref,
) {
  const fgRef = useRef<ForceGraphMethods<FGNode, GraphEdge>>();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const reducedMotion = prefersReducedMotion();

  // Lazily loaded + cached avatar/icon images so nodes show real portraits/icons.
  const imgCache = useRef<Map<string, HTMLImageElement>>(new Map());
  function getImg(url: string): HTMLImageElement | null {
    const cache = imgCache.current;
    let img = cache.get(url);
    if (!img) {
      img = new Image();
      img.src = url;
      cache.set(url, img);
    }
    return img.complete && img.naturalWidth > 0 ? img : null;
  }
  function imageUriFor(node: FGNode): string | null {
    if (!IMAGE_TYPES.has(node.type)) return null;
    const meta = node.metadata as Record<string, unknown> | null | undefined;
    const explicit = (meta?.avatar_url ?? meta?.icon ?? meta?.icon_url) as string | undefined;
    return entityImageUri(node.type, node.entityId || node.id, explicit);
  }

  // degree per node (drives area-proportional sizing + hub detection)
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
      base.__raw = getNodeColorRaw(n.type);
      base.__border = getStatusColor(n.status);
      base.__deg = degree.get(n.id) ?? 0;
      // Resolve the avatar/icon data-URI ONCE per data change (DiceBear's
      // toDataUri() is expensive — never call it inside the per-frame painter).
      base.__uri = imageUriFor(base);
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

  // Ambient re-paint loop: keeps the canvas repainting after the simulation
  // cools so the idle bob + orbital rings animate ("respira"). Skipped under
  // reduced-motion. (Resting particles also keep the engine's frame loop warm.)
  const [, setTick] = useState(0);
  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    let last = 0;
    const loop = (ts: number) => {
      if (ts - last > 70) {
        setTick((t) => (t + 1) % 4096);
        last = ts;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  // Perf: freeze layout sooner as the graph grows; offload to worker past ~800 nodes.
  const n = data.nodes.length;
  const cooldownTicks = reducedMotion ? 50 : (n > 500 ? 80 : n > 200 ? 120 : 200);
  const useWorker = n > 800;
  const FG = ForceGraph2D as unknown as React.ComponentType<Record<string, unknown>>;

  const voidColor = getVoidColor();

  return (
    <div
      className="relative isolate overflow-hidden"
      style={{ width, height, background: voidColor }}
    >
      {/* dot-grid coordinate overlay (shows through the transparent canvas) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(var(--graph-grid) / 0.05) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />
      {/* inner vignette — focuses the eye and deepens the void at the edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, transparent 0%, hsl(var(--surface-void) / 0.55) 92%)",
        }}
      />

      <FG
        ref={fgRef}
        width={width}
        height={height}
        graphData={fgData}
        backgroundColor="transparent"
        cooldownTicks={cooldownTicks}
        nodeRelSize={forces.nodeSize}
        nodeVal={(node: FGNode) => (node.__deg ?? 0) + 1}
        useWorkerForCalc={useWorker}
        minZoom={0.4}
        maxZoom={5}
        onNodeClick={(node: FGNode) => onNodeClick(node)}
        onNodeHover={(node: FGNode | null) => {
          setHoverId(node?.id ?? null);
          onNodeHover?.(node ?? null);
        }}
        onNodeDragEnd={(node: FGNode) => {
          node.fx = node.x;
          node.fy = node.y;
        }}
        linkColor={() => "transparent"}
        linkCurvature={EDGE_CURVATURE}
        linkCanvasObjectMode={() => "replace"}
        linkCanvasObject={(link: GraphEdge, ctx: CanvasRenderingContext2D) => {
          const s = link.source as unknown as FGNode;
          const t = link.target as unknown as FGNode;
          if (typeof s?.x !== "number" || typeof s?.y !== "number") return;
          if (typeof t?.x !== "number" || typeof t?.y !== "number") return;

          const [sid, tid] = edgeEnds(link);
          const emph = highlightedSet ? highlightedSet.has(sid) && highlightedSet.has(tid) : false;
          const dim = highlightedSet ? !emph : false;

          const { cyanRaw } = resolveThemeTokens();
          const srcRaw = s.__raw ?? "228 12% 64%";
          // Source→target gradient: entity hue fading into signal-cyan.
          const a0 = dim ? 0.05 : emph ? 0.55 : 0.16;
          const a1 = dim ? 0.06 : emph ? 0.7 : 0.24;
          const grad = ctx.createLinearGradient(s.x, s.y, t.x, t.y);
          grad.addColorStop(0, `hsl(${srcRaw} / ${a0})`);
          grad.addColorStop(1, `hsl(${cyanRaw} / ${a1})`);

          // Quadratic curve — control point offset along the perpendicular by
          // EDGE_CURVATURE so it matches the lib's particle arc.
          const dx = t.x - s.x, dy = t.y - s.y;
          const dist = Math.hypot(dx, dy) || 1;
          const nx = dy / dist, ny = -dx / dist;
          const off = EDGE_CURVATURE * dist;
          const cpx = (s.x + t.x) / 2 + nx * off;
          const cpy = (s.y + t.y) / 2 + ny * off;

          const weight = RELATION_STYLES[link.type]?.weight ?? 1;
          const dash = edgeDash(link.type, link.edgeKind);
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.quadraticCurveTo(cpx, cpy, t.x, t.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = (emph ? 1.6 : 0.85) * (0.6 + weight * 0.3);
          if (dash) ctx.setLineDash(dash);
          ctx.stroke();
          ctx.setLineDash([]);
        }}
        /* Phosphor particles drift even at rest (subtle), brighter within the
           focused neighbourhood. Resting particles also keep the frame loop
           warm so the bob animates. None under reduced-motion. */
        linkDirectionalParticles={(l: GraphEdge) => {
          if (reducedMotion) return 0;
          const [sid, tid] = edgeEnds(l);
          return highlightedSet && highlightedSet.has(sid) && highlightedSet.has(tid) ? 3 : 1;
        }}
        linkDirectionalParticleSpeed={(l: GraphEdge) => {
          const [sid, tid] = edgeEnds(l);
          return highlightedSet && highlightedSet.has(sid) && highlightedSet.has(tid) ? 0.011 : 0.0022;
        }}
        linkDirectionalParticleWidth={(l: GraphEdge) => {
          const [sid, tid] = edgeEnds(l);
          return highlightedSet && highlightedSet.has(sid) && highlightedSet.has(tid) ? 3 : 1.6;
        }}
        linkDirectionalParticleColor={(l: GraphEdge) => {
          const src = l.source as unknown as FGNode;
          const raw = src?.__raw ?? rawVar("--signal-cyan-300", "349 85% 62%");
          const [sid, tid] = edgeEnds(l);
          const emph = highlightedSet ? highlightedSet.has(sid) && highlightedSet.has(tid) : false;
          return `hsl(${raw} / ${emph ? 0.95 : 0.5})`;
        }}
        nodeCanvasObject={(node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const x0 = node.x ?? 0;
          const y0 = node.y ?? 0;
          const r = nodeRadius(node.__deg ?? 0, forces.nodeSize);
          const dimmed = highlightedSet ? !highlightedSet.has(node.id) : false;
          const isSelected = node.id === selectedId;
          const isHovered = node.id === hoverId;
          const isFocus = isSelected || isHovered;
          const isHub = (node.__deg ?? 0) >= HUB_DEGREE;

          const { labelColor, selectionColor, hoverColor, cardColor, cyanRaw } = resolveThemeTokens();
          const color = node.__color ?? "hsl(228 12% 64%)";
          const raw = node.__raw ?? "228 12% 64%";

          // Idle bob so the constellation breathes.
          const now = typeof performance !== "undefined" ? performance.now() : 0;
          const { dx, dy } = reducedMotion ? { dx: 0, dy: 0 } : bob(node.id, now);
          const x = x0 + dx;
          const y = y0 + dy;

          ctx.globalAlpha = dimmed ? 0.16 : 1;

          // Hub orbital ring + rotating tick (drawn behind the body).
          if (isHub) {
            const ringR = r + 9 / globalScale;
            const spin = reducedMotion ? 0 : (now / 9000) % (Math.PI * 2);
            ctx.beginPath();
            ctx.arc(x, y, ringR, 0, 2 * Math.PI);
            ctx.strokeStyle = isFocus ? `hsl(${cyanRaw} / 0.5)` : "hsl(228 12% 42% / 0.25)";
            ctx.lineWidth = 1 / globalScale;
            ctx.setLineDash([3 / globalScale, 5 / globalScale]);
            ctx.stroke();
            ctx.setLineDash([]);
            const tx = x + Math.cos(spin) * ringR;
            const ty = y + Math.sin(spin) * ringR;
            ctx.beginPath();
            ctx.arc(tx, ty, 1.6 / globalScale, 0, 2 * Math.PI);
            ctx.fillStyle = `hsl(${cyanRaw} / 0.9)`;
            ctx.fill();
          }

          // 0. Glow bloom — real shadowBlur so nodes read as glowing phosphor.
          ctx.save();
          ctx.shadowColor = fade(color, 0.9);
          ctx.shadowBlur = isFocus ? 30 : isHub ? 22 : 16;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 2 * Math.PI);
          ctx.fillStyle = fade(color, isFocus ? 1 : 0.85);
          ctx.fill();
          ctx.restore();

          // 1. Soft translucent halo disc behind the body.
          ctx.beginPath();
          ctx.arc(x, y, r + (isFocus ? 12 : 7) / globalScale, 0, 2 * Math.PI);
          ctx.fillStyle = `hsl(${raw} / ${isFocus ? 0.3 : 0.16})`;
          ctx.fill();

          // 2. Body — avatar/icon image clipped to the circle, else colored disc.
          //    URI was resolved once at data-build time (see __uri).
          const img = node.__uri ? getImg(node.__uri) : null;
          if (img) {
            // tinted backing so a still-loading or transparent image still glows
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.fillStyle = `hsl(${raw} / 0.28)`;
            ctx.fill();
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.clip();
            ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
            ctx.restore();
          } else {
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.fillStyle = fade(color, 0.95);
            ctx.fill();
          }

          // crisp entity-color stroke around the body
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 2 * Math.PI);
          ctx.lineWidth = (isFocus ? 1.8 : 1.1) / globalScale;
          ctx.strokeStyle = `hsl(${raw} / ${isFocus ? 1 : 0.7})`;
          ctx.stroke();

          // 3. Status ring — thin accent just outside the body when status known.
          if (node.__border && !isSelected) {
            ctx.beginPath();
            ctx.arc(x, y, r + 2.5 / globalScale, 0, 2 * Math.PI);
            ctx.lineWidth = 1.4 / globalScale;
            ctx.strokeStyle = node.__border;
            ctx.stroke();
          }

          // 4. Selection ring = electric-violet · hover ring = signal-cyan.
          if (isSelected) {
            ctx.beginPath();
            ctx.arc(x, y, r + 5 / globalScale, 0, 2 * Math.PI);
            ctx.lineWidth = 2 / globalScale;
            ctx.strokeStyle = selectionColor;
            ctx.stroke();
          } else if (isHovered) {
            ctx.beginPath();
            ctx.arc(x, y, r + 4 / globalScale, 0, 2 * Math.PI);
            ctx.lineWidth = 1.6 / globalScale;
            ctx.strokeStyle = hoverColor;
            ctx.stroke();
          }

          // 5. Label — mono, uppercase, letter-spaced, subtle backplate; shown
          //    only past the zoom threshold or when focused (de-cluttered).
          const inFocus = isFocus || (highlightedSet ? highlightedSet.has(node.id) && !dimmed : false);
          if (globalScale >= LABEL_ZOOM_THRESHOLD || inFocus) {
            const fontSize = Math.max(9, 10.5 / globalScale);
            ctx.font = `${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
            const ctxLs = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
            const prevLs = ctxLs.letterSpacing;
            try { ctxLs.letterSpacing = `${0.04 * fontSize}px`; } catch { /* unsupported */ }
            const raw0 = (node.label ?? "").toUpperCase();
            const label = raw0.length > 22 ? raw0.slice(0, 22) + "…" : raw0;
            const padX = 4 / globalScale;
            const padY = 2.5 / globalScale;
            const tw = ctx.measureText(label).width;
            const bpW = tw + padX * 2;
            const bpH = fontSize + padY * 2;
            const bpX = x - bpW / 2;
            const bpY = y + r + 6 / globalScale;

            ctx.beginPath();
            ctx.moveTo(bpX + 3 / globalScale, bpY);
            ctx.arcTo(bpX + bpW, bpY, bpX + bpW, bpY + bpH, 3 / globalScale);
            ctx.arcTo(bpX + bpW, bpY + bpH, bpX, bpY + bpH, 3 / globalScale);
            ctx.arcTo(bpX, bpY + bpH, bpX, bpY, 3 / globalScale);
            ctx.arcTo(bpX, bpY, bpX + bpW, bpY, 3 / globalScale);
            ctx.closePath();
            ctx.fillStyle = fade(cardColor, 0.62);
            ctx.fill();

            ctx.fillStyle = isFocus ? hoverColor : labelColor;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(label, x, bpY + bpH / 2);
            try { ctxLs.letterSpacing = prevLs ?? "0px"; } catch { /* noop */ }
          }

          ctx.globalAlpha = 1;
        }}
        nodePointerAreaPaint={(node: FGNode, color: string, ctx: CanvasRenderingContext2D) => {
          const x = node.x ?? 0;
          const y = node.y ?? 0;
          const r = nodeRadius(node.__deg ?? 0, forces.nodeSize);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, r + 3, 0, 2 * Math.PI);
          ctx.fill();
        }}
      />
    </div>
  );
});
