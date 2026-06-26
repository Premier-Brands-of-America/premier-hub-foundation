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
import { Skeleton } from "@/components/ui/skeleton";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphRealtime } from "@/hooks/use-graph-realtime";
import { DEFAULT_FORCES } from "@/types/graph";
import type { GraphEdge, GraphFilters, GraphForces, GraphNode, GraphPayload, GraphViewFilters, NodeType, RelationType } from "@/types/graph";

const ALL_NODE_TYPES: NodeType[] = ["project", "task", "request", "page", "user"];

function edgeEnds(e: GraphEdge): [string, string] {
  const s = typeof e.source === "string" ? e.source : (e.source as unknown as GraphNode).id;
  const t = typeof e.target === "string" ? e.target : (e.target as unknown as GraphNode).id;
  return [s, t];
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

export default function GraphPage() {
  const [params, setParams] = useSearchParams();
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
  const { data, isLoading } = useGraphData(filters);

  useEffect(() => {
    setParams(filtersToParams(filters), { replace: true });
  }, [filters, setParams]);

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
  const payload = useMemo(() => applyViewFilters(raw, view), [raw, view]);

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

  const handleExport = () => {
    const dataUrl = canvasRef.current?.exportPng();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `graph-${Date.now()}.png`;
    a.click();
  };

  return (
    <div ref={containerRef} className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {payload.truncated && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-warning/90 text-warning-foreground text-xs px-3 py-1 rounded shadow">
          Showing {payload.nodes.length} of many — refine filters or focus a local graph
        </div>
      )}

      {rooted && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 mt-8 flex items-center gap-2 bg-card text-xs px-3 py-1 rounded shadow border">
          <span>Local graph · depth {filters.depth ?? 1}</span>
          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={handleClearFocus}>
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
            <div className="p-4 space-y-2">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-[60vh] w-full" />
            </div>
          ) : (
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
          )}

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
          <div className="absolute bottom-3 right-3 z-10">
            <GraphLegend />
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
