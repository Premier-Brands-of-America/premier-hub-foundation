import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { GraphCanvas, type GraphCanvasHandle } from "@/components/graph/GraphCanvas";
import { GraphFiltersPanel } from "@/components/graph/GraphFiltersPanel";
import { GraphToolbar } from "@/components/graph/GraphToolbar";
import { GraphLegend } from "@/components/graph/GraphLegend";
import { NodeDetailSheet } from "@/components/graph/NodeDetailSheet";
import { GraphListFallback } from "@/components/graph/GraphListFallback";
import { Skeleton } from "@/components/ui/skeleton";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphRealtime } from "@/hooks/use-graph-realtime";
import type { GraphFilters, GraphNode, NodeType, RelationType } from "@/types/graph";

const ALL_NODE_TYPES: NodeType[] = ["project", "task", "request", "page", "user"];

function filtersFromParams(p: URLSearchParams): GraphFilters {
  const types = p.get("types")?.split(",").filter(Boolean) as NodeType[] | undefined;
  const rels = p.get("rel")?.split(",").filter(Boolean) as RelationType[] | undefined;
  return {
    entity_types: types?.length ? types : undefined,
    relation_types: rels?.length ? rels : undefined,
  };
}
function filtersToParams(f: GraphFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.entity_types?.length && f.entity_types.length !== ALL_NODE_TYPES.length)
    p.set("types", f.entity_types.join(","));
  if (f.relation_types?.length) p.set("rel", f.relation_types.join(","));
  return p;
}

export default function GraphPage() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<GraphFilters>(() => filtersFromParams(params));
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

  const payload = useMemo(
    () => data ?? { nodes: [], edges: [], truncated: false },
    [data],
  );

  const handleNodeClick = (n: GraphNode) => {
    setSelected(n);
    setSheetOpen(true);
  };

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
          Showing {payload.nodes.length} of many — refine filters
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
              width={size.w}
              height={size.h}
              selectedId={selected?.id ?? null}
              onNodeClick={handleNodeClick}
            />
          )}

          <div className="absolute top-3 left-3 z-10">
            <GraphFiltersPanel filters={filters} onChange={setFilters} />
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
      />
    </div>
  );
}