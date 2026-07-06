import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { GraphCanvas, type GraphCanvasHandle } from "@/components/graph/GraphCanvas";
import { GraphFiltersPanel } from "@/components/graph/GraphFiltersPanel";
import { GraphControlsPanel } from "@/components/graph/GraphControlsPanel";
import { GraphToolbar } from "@/components/graph/GraphToolbar";
import { GraphLegend } from "@/components/graph/GraphLegend";
import { NodeDetailSheet } from "@/components/graph/NodeDetailSheet";
import { GraphListFallback } from "@/components/graph/GraphListFallback";
import { Button } from "@/components/ui/button";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphRealtime } from "@/hooks/use-graph-realtime";
import { useAuth } from "@/hooks/useAuth";
import { useQueue } from "@/hooks/useRequests";
import { buildTeamLoad } from "@/lib/workloadMetrics";
import { MemoryInsightsPanel } from "@/components/memory/MemoryInsightsPanel";
import { DEFAULT_FORCES } from "@/types/graph";
import { Network, Share2, Brain, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GraphEdge, GraphFilters, GraphForces, GraphMode, GraphNode, GraphPayload, GraphViewFilters, NodeType, RelationType } from "@/types/graph";

const ALL_NODE_TYPES: NodeType[] = ["project", "task", "request", "page", "user", "department"];

const MODE_META: Record<GraphMode, { label: string; icon: typeof Network; blurb: string }> = {
  network: { label: "Network", icon: Network, blurb: "How everything connects" },
  org: { label: "Org", icon: Share2, blurb: "Reports-to hierarchy" },
  memory: { label: "Memory", icon: Brain, blurb: "Your personal knowledge graph" },
};

function GraphModeSwitch({ mode, onChange }: { mode: GraphMode; onChange: (m: GraphMode) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/90 p-1 shadow-sm backdrop-blur-sm">
      {(Object.keys(MODE_META) as GraphMode[]).map((m) => {
        const { label, icon: Icon } = MODE_META[m];
        const active = m === mode;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            title={MODE_META[m].blurb}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        );
      })}
    </div>
  );
}

function edgeEnds(e: GraphEdge): [string, string] {
  const s = typeof e.source === "string" ? e.source : (e.source as unknown as GraphNode).id;
  const t = typeof e.target === "string" ? e.target : (e.target as unknown as GraphNode).id;
  return [s, t];
}

/** Prune to the neighborhood within `depth` hops of the focused node (local graph). */
function localSubgraph(payload: GraphPayload, centerId: string, depth: number): GraphPayload {
  const center = payload.nodes.find((n) => n.entityId === centerId || n.id === centerId);
  if (!center) return payload;
  const adj = new Map<string, string[]>();
  payload.edges.forEach((e) => {
    const [s, t] = edgeEnds(e);
    (adj.get(s) ?? adj.set(s, []).get(s)!).push(t);
    (adj.get(t) ?? adj.set(t, []).get(t)!).push(s);
  });
  const keep = new Set<string>([center.id]);
  let frontier = [center.id];
  for (let d = 0; d < Math.max(1, depth); d++) {
    const next: string[] = [];
    for (const id of frontier) {
      (adj.get(id) ?? []).forEach((nb) => {
        if (!keep.has(nb)) { keep.add(nb); next.push(nb); }
      });
    }
    frontier = next;
  }
  const nodes = payload.nodes.filter((n) => keep.has(n.id));
  const edges = payload.edges.filter((e) => {
    const [s, t] = edgeEnds(e);
    return keep.has(s) && keep.has(t);
  });
  return { nodes, edges, truncated: payload.truncated };
}

function filtersFromParams(p: URLSearchParams): GraphFilters {
  const types = p.get("types")?.split(",").filter(Boolean) as NodeType[] | undefined;
  const rels = p.get("rel")?.split(",").filter(Boolean) as RelationType[] | undefined;
  const ct = p.get("ct") as NodeType | null;
  const ci = p.get("ci");
  const depth = p.get("depth");
  return {
    entity_types: types?.length ? types : undefined,
    relation_types: rels?.length ? rels : undefined,
    center_type: ct ?? undefined,
    center_id: ci ?? undefined,
    depth: depth ? Number(depth) : undefined,
  };
}
function filtersToParams(f: GraphFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.entity_types?.length && f.entity_types.length !== ALL_NODE_TYPES.length)
    p.set("types", f.entity_types.join(","));
  if (f.relation_types?.length) p.set("rel", f.relation_types.join(","));
  if (f.center_type && f.center_id) {
    p.set("ct", f.center_type);
    p.set("ci", f.center_id);
    if (f.depth) p.set("depth", String(f.depth));
  }
  return p;
}

/** Apply client-side view filters (status, orphans) without refetching. */
function applyViewFilters(payload: GraphPayload, view: GraphViewFilters): GraphPayload {
  let nodes = payload.nodes;
  if (view.statuses) {
    const allow = new Set(view.statuses);
    nodes = nodes.filter((n) => !n.status || allow.has(n.status));
  }
  let nodeIds = new Set(nodes.map((n) => n.id));
  let edges = payload.edges.filter((e) => {
    const [s, t] = edgeEnds(e);
    return nodeIds.has(s) && nodeIds.has(t);
  });
  if (view.hideOrphans) {
    const linked = new Set<string>();
    edges.forEach((e) => { const [s, t] = edgeEnds(e); linked.add(s); linked.add(t); });
    nodes = nodes.filter((n) => linked.has(n.id));
    nodeIds = new Set(nodes.map((n) => n.id));
    edges = edges.filter((e) => { const [s, t] = edgeEnds(e); return nodeIds.has(s) && nodeIds.has(t); });
  }
  return { nodes, edges, truncated: payload.truncated };
}

/** Polished loading shimmer for the graph canvas area. */
function GraphLoadingShimmer({ width, height }: { width: number; height: number }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden bg-background"
      style={{ width, height }}
      aria-label="Loading graph…"
    >
      {/* Animated gradient sweep using the design-system shimmer keyframe */}
      <div
        className="absolute inset-0 animate-shimmer"
        style={{
          background: "linear-gradient(90deg, transparent 0%, hsl(var(--muted)/0.7) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
        }}
      />

      {/* Faint node placeholders scattered across the canvas */}
      <svg width={width} height={height} className="absolute inset-0 opacity-20">
        {/* Simulated node clusters */}
        {[
          { cx: 0.35, cy: 0.4, r: 18 }, { cx: 0.55, cy: 0.3, r: 12 }, { cx: 0.65, cy: 0.55, r: 22 },
          { cx: 0.45, cy: 0.65, r: 10 }, { cx: 0.25, cy: 0.55, r: 15 }, { cx: 0.72, cy: 0.38, r: 8 },
          { cx: 0.5,  cy: 0.5,  r: 28 }, { cx: 0.3,  cy: 0.28, r: 9 },  { cx: 0.78, cy: 0.62, r: 13 },
          { cx: 0.18, cy: 0.42, r: 7 },  { cx: 0.6,  cy: 0.7,  r: 11 }, { cx: 0.42, cy: 0.22, r: 16 },
        ].map(({ cx, cy, r }, i) => (
          <circle
            key={i}
            cx={cx * width}
            cy={cy * height}
            r={r}
            fill="hsl(var(--muted-foreground))"
            opacity={0.4 + (i % 3) * 0.15}
          />
        ))}
        {/* Simulated edges */}
        {[
          [0.35, 0.4, 0.5, 0.5], [0.5, 0.5, 0.65, 0.55], [0.5, 0.5, 0.55, 0.3],
          [0.55, 0.3, 0.35, 0.4], [0.25, 0.55, 0.35, 0.4], [0.45, 0.65, 0.5, 0.5],
          [0.72, 0.38, 0.65, 0.55], [0.78, 0.62, 0.65, 0.55], [0.3, 0.28, 0.35, 0.4],
        ].map(([x1, y1, x2, y2], i) => (
          <line
            key={i}
            x1={(x1 ?? 0) * width}
            y1={(y1 ?? 0) * height}
            x2={(x2 ?? 0) * width}
            y2={(y2 ?? 0) * height}
            stroke="hsl(var(--border))"
            strokeWidth={1.5}
            opacity={0.6}
          />
        ))}
      </svg>

      {/* Centre status chip */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-2.5 bg-card/90 border border-border/60 rounded-full px-4 py-2 shadow-sm backdrop-blur-sm">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground font-medium tracking-wide">
            Building graph…
          </span>
        </div>
      </div>
    </div>
  );
}

/** Desktop empty state when the filtered graph has no nodes. */
function GraphEmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 pointer-events-none select-none">
      {/* Icon with ring */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-24 h-24 rounded-full bg-muted/50 animate-pulse" />
        <div className="relative w-16 h-16 rounded-full bg-muted flex items-center justify-center border border-border/60">
          <Network className="h-7 w-7 text-muted-foreground/60" />
        </div>
      </div>

      <div className="text-center space-y-1.5">
        <h3 className="text-base font-semibold text-foreground/80">No nodes to display</h3>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          The current filters returned an empty graph. Try broadening your entity types, removing status filters, or disabling "hide orphans".
        </p>
      </div>

      <div className="pointer-events-auto">
        <Button variant="outline" size="sm" className="gap-2" onClick={onReset}>
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Reset filters
        </Button>
      </div>
    </div>
  );
}

/** Small stats pill — node count by type + edge total. */
function GraphStats({ payload }: { payload: GraphPayload }) {
  const typeOrder: NodeType[] = ["project", "task", "request", "page", "user", "department"];
  const counts = useMemo(() => {
    const m: Partial<Record<NodeType, number>> = {};
    for (const n of payload.nodes) {
      if (n.type in m) { m[n.type] = (m[n.type] ?? 0) + 1; }
      else { m[n.type] = 1; }
    }
    return m;
  }, [payload.nodes]);

  const parts = typeOrder
    .filter((t) => (counts[t] ?? 0) > 0)
    .map((t) => `${counts[t]} ${t}${(counts[t] ?? 0) !== 1 ? "s" : ""}`);

  if (parts.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 bg-card/80 border border-border/50 rounded-full px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-sm shadow-sm select-none">
      <span className="font-medium">{payload.nodes.length}</span>
      <span>nodes</span>
      <span className="opacity-40">·</span>
      <span className="font-medium">{payload.edges.length}</span>
      <span>edges</span>
    </div>
  );
}

export default function GraphPage({ initialMode }: { initialMode?: GraphMode } = {}) {
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<GraphMode>(
    () => initialMode ?? (params.get("mode") as GraphMode | null) ?? "network",
  );
  const [filters, setFilters] = useState<GraphFilters>(() => filtersFromParams(params));
  const [view, setView] = useState<GraphViewFilters>({});
  const [forces, setForces] = useState<GraphForces>(() => ({ ...DEFAULT_FORCES }));
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const canvasRef = useRef<GraphCanvasHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [isMobile, setIsMobile] = useState(false);

  useGraphRealtime();
  const { data, isLoading } = useGraphData(filters, mode);
  const { profile } = useAuth();
  const isAdmin = !!profile?.is_admin || profile?.role === "admin";

  useEffect(() => {
    const p = filtersToParams(filters);
    if (mode !== "network") p.set("mode", mode);
    setParams(p, { replace: true });
  }, [filters, mode, setParams]);

  useEffect(() => {
    const update = () => {
      const w = containerRef.current?.clientWidth ?? window.innerWidth;
      const h = containerRef.current?.clientHeight ?? window.innerHeight;
      setSize({ w, h });
      setIsMobile(window.innerWidth < 768);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const raw = useMemo(
    () => data ?? { nodes: [], edges: [], truncated: false },
    [data],
  );
  // Local-graph: when a node is focused, prune to its neighborhood within `depth`
  // hops (works for all modes incl. the preview demo builders).
  const scoped = useMemo(
    () => (filters.center_id ? localSubgraph(raw, filters.center_id, filters.depth ?? 1) : raw),
    [raw, filters.center_id, filters.depth],
  );
  const filtered = useMemo(() => applyViewFilters(scoped, view), [scoped, view]);

  // Workload reflection (§3.2): compute per-person open Workload Points from the
  // request queue (client-side, no SQL) and stamp them onto `user` nodes so the
  // canvas can size + ring them. Person nodes key off entityId/label (lowercased)
  // to match `requestLead().key`. Works in preview and production alike.
  const { data: queueData } = useQueue();
  const workloadByKey = useMemo(() => {
    const team = buildTeamLoad(queueData ?? [], "all_open");
    const m = new Map<string, { points: number; overloaded: boolean }>();
    for (const p of team.people) {
      m.set(p.person.key, { points: p.points, overloaded: p.band === "over" });
    }
    return m;
  }, [queueData]);

  const payload = useMemo<GraphPayload>(() => {
    if (workloadByKey.size === 0) return filtered;
    const nodes = filtered.nodes.map((n) => {
      if (n.type !== "user") return n;
      const key = (n.entityId || n.label || "").toLowerCase();
      const load = workloadByKey.get(key);
      if (!load) return n;
      return {
        ...n,
        metadata: { ...(n.metadata ?? {}), workloadPoints: load.points, overloaded: load.overloaded },
      };
    });
    return { ...filtered, nodes };
  }, [filtered, workloadByKey]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    raw.nodes.forEach((n) => { if (n.status) set.add(n.status); });
    return Array.from(set).sort();
  }, [raw.nodes]);

  // search-dim: ids of nodes matching the search term (others get dimmed in the canvas)
  const searchHighlight = useMemo(() => {
    const term = view.search?.trim().toLowerCase();
    if (!term) return undefined;
    const ids = payload.nodes
      .filter((n) => n.label?.toLowerCase().includes(term))
      .map((n) => n.id);
    return new Set(ids);
  }, [view.search, payload.nodes]);

  // Node counts per type (passed to legend for count badges)
  const nodeCounts = useMemo(() => {
    const m: Partial<Record<NodeType, number>> = {};
    for (const n of payload.nodes) {
      m[n.type] = (m[n.type] ?? 0) + 1;
    }
    return m;
  }, [payload.nodes]);

  // Departments present (Org mode) → drives the department color legend. In org
  // mode people carry `metadata.department`; person nodes are colored by it.
  const departments = useMemo(() => {
    if (mode !== "org") return undefined;
    const set = new Set<string>();
    for (const n of payload.nodes) {
      const d = (n.metadata as Record<string, unknown> | null | undefined)?.department;
      if (typeof d === "string" && d.trim()) set.add(d.trim());
    }
    return set.size > 0 ? Array.from(set).sort() : undefined;
  }, [payload.nodes, mode]);

  const rooted = !!filters.center_id;

  const handleNodeClick = (n: GraphNode) => {
    setSelected(n);
    setSheetOpen(true);
  };

  const handleFocusLocal = (n: GraphNode) => {
    setFilters((f) => ({ ...f, center_type: n.type, center_id: n.entityId, depth: f.depth ?? 1 }));
    setSheetOpen(false);
  };
  const handleClearFocus = () =>
    setFilters((f) => ({ ...f, center_type: undefined, center_id: undefined, depth: undefined }));

  const handleResetFilters = () => {
    setFilters({ entity_types: undefined, relation_types: undefined });
    setView({});
  };

  const handleExport = () => {
    const dataUrl = canvasRef.current?.exportPng();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `graph-${Date.now()}.png`;
    a.click();
  };

  const isEmpty = !isLoading && payload.nodes.length === 0;

  return (
    <div ref={containerRef} className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Mode switch: Network / Org / Memory */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
        <GraphModeSwitch mode={mode} onChange={setMode} />
      </div>

      {/* Truncation banner */}
      {payload.truncated && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 mt-12 bg-warning/90 text-warning-foreground text-xs px-3 py-1 rounded-full shadow font-medium">
          Showing {payload.nodes.length} of many — refine filters or focus a local graph
        </div>
      )}

      {/* Rooted / local graph badge */}
      {rooted && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 mt-12 flex items-center gap-2 bg-card/95 text-xs px-3 py-1.5 rounded-full shadow border border-border/60 backdrop-blur-sm">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-muted-foreground">Local graph</span>
          <span className="font-medium">depth {filters.depth ?? 1}</span>
          <Button variant="ghost" size="sm" className="h-5 px-2 text-xs" onClick={handleClearFocus}>
            See everything
          </Button>
        </div>
      )}

      {isMobile ? (
        <div className="h-full overflow-y-auto">
          <GraphListFallback data={payload} onNodeClick={handleNodeClick} />
        </div>
      ) : (
        <>
          {isLoading ? (
            <GraphLoadingShimmer width={size.w} height={size.h} />
          ) : (
            <>
              <GraphCanvas
                ref={canvasRef}
                data={payload}
                forces={forces}
                width={size.w}
                height={size.h}
                selectedId={selected?.id ?? null}
                highlightIds={searchHighlight}
                onNodeClick={handleNodeClick}
              />
              {isEmpty && <GraphEmptyState onReset={handleResetFilters} />}
            </>
          )}

          {/* Left panel: Filters + Forces */}
          <div className="absolute top-3 left-3 z-10 space-y-3">
            <GraphFiltersPanel
              filters={filters}
              onChange={setFilters}
              view={view}
              onViewChange={setView}
              statusOptions={statusOptions}
            />
            <GraphControlsPanel
              forces={forces}
              onChange={setForces}
              depth={filters.depth ?? 1}
              onDepthChange={(d) => setFilters((f) => ({ ...f, depth: d }))}
              rooted={rooted}
            />
          </div>

          {/* Memory-mode insights: key concepts, surprising connections, wiki, rebuild */}
          {mode === "memory" && (
            <div className="absolute top-16 right-3 z-10">
              <MemoryInsightsPanel
                nodes={payload.nodes}
                edges={payload.edges}
                isAdmin={isAdmin}
                onFocusNode={(id) => {
                  canvasRef.current?.centerOnNode(id);
                  const n = payload.nodes.find((x) => x.id === id);
                  if (n) setSelected(n);
                }}
              />
            </div>
          )}

          {/* Top-right: Toolbar */}
          <div className="absolute top-3 right-3 z-10">
            <GraphToolbar
              nodes={payload.nodes}
              onFit={() => canvasRef.current?.zoomToFit()}
              onZoomIn={() => canvasRef.current?.zoomBy(1.4)}
              onZoomOut={() => canvasRef.current?.zoomBy(1 / 1.4)}
              onExport={handleExport}
              onSearchSelect={(n) => {
                canvasRef.current?.centerOnNode(n.id);
                setSelected(n);
              }}
            />
          </div>

          {/* Bottom-right: Stats + Legend */}
          <div className="absolute bottom-3 right-3 z-10 flex flex-col items-end gap-2">
            {!isLoading && payload.nodes.length > 0 && (
              <GraphStats payload={payload} />
            )}
            <GraphLegend
              counts={nodeCounts}
              showWorkload={mode === "network"}
              departments={departments}
            />
          </div>
        </>
      )}

      <NodeDetailSheet
        open={sheetOpen}
        onOpenChange={(o) => { setSheetOpen(o); if (!o) setSelected(null); }}
        node={selected}
        onFocusLocal={handleFocusLocal}
      />
    </div>
  );
}
