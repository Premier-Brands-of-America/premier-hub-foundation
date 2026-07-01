import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain, Sparkles, RefreshCw, ChevronDown, ChevronRight, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchGodNodes, fetchSurprisingEdges, fetchMemoryWiki, rebuildMemory,
} from "@/services/memoryService";
import type { GraphEdge, GraphNode } from "@/types/graph";

/** Human-readable label for a node id ("concept:uuid") using the graph's nodes. */
function labelFor(id: string, nodes: GraphNode[]): string {
  const n = nodes.find((x) => x.id === id);
  if (n) return n.label;
  const [type, rest] = id.split(":");
  return `${type} ${rest?.slice(0, 6) ?? ""}`;
}

function edgeEnds(e: GraphEdge): [string, string] {
  const s = typeof e.source === "string" ? e.source : (e.source as unknown as GraphNode).id;
  const t = typeof e.target === "string" ? e.target : (e.target as unknown as GraphNode).id;
  return [s, t];
}

/**
 * Insights side-panel for the memory knowledge graph: the graph's key concepts
 * (god nodes), surprising cross-cluster connections (with the AI's rationale),
 * and an on-demand per-topic wiki summary. Admins also get a Rebuild action.
 */
export function MemoryInsightsPanel({
  nodes,
  edges,
  isAdmin,
  onFocusNode,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  isAdmin: boolean;
  onFocusNode: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [wikiTopic, setWikiTopic] = useState<string | null>(null);
  const [wikiBody, setWikiBody] = useState<string>("");
  const [wikiLoading, setWikiLoading] = useState(false);

  const godNodes = useQuery({ queryKey: ["memory", "god-nodes"], queryFn: () => fetchGodNodes(6) });
  const surprising = useQuery({ queryKey: ["memory", "surprising"], queryFn: () => fetchSurprisingEdges(5) });

  const handleRebuild = async () => {
    setRebuilding(true);
    try {
      const r = await rebuildMemory(40);
      toast[r.ok ? "success" : "error"](r.ok ? "Memory rebuild" : "Rebuild failed", { description: r.message });
    } catch (e) {
      toast.error("Rebuild failed", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setRebuilding(false);
    }
  };

  const openWiki = async (topic: string, relatedIds: string[]) => {
    setWikiTopic(topic);
    setWikiBody("");
    setWikiLoading(true);
    try {
      const related = relatedIds.map((id) => labelFor(id, nodes));
      setWikiBody(await fetchMemoryWiki(topic, related));
    } catch (e) {
      setWikiBody(`_Could not generate summary: ${e instanceof Error ? e.message : String(e)}_`);
    } finally {
      setWikiLoading(false);
    }
  };

  // A topic's real graph neighbours — the other endpoint of every incident edge.
  const neighboursOf = (nodeId: string): string[] => {
    const seen = new Set<string>();
    for (const e of edges) {
      const [s, t] = edgeEnds(e);
      if (s === nodeId && !seen.has(t)) seen.add(t);
      else if (t === nodeId && !seen.has(s)) seen.add(s);
    }
    return Array.from(seen).slice(0, 20);
  };

  return (
    <div className="w-72 max-w-[80vw] rounded-xl border border-border/60 bg-card/95 shadow-lg backdrop-blur-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left border-b border-border/50"
      >
        <Brain className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold flex-1">Insights</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {/* Key concepts (god nodes) */}
          <section>
            <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Sparkles className="h-3.5 w-3.5" /> Key concepts
            </div>
            {godNodes.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : (godNodes.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No concepts yet — rebuild memory to extract them.</p>
            ) : (
              <ul className="space-y-1">
                {(godNodes.data ?? []).map((g) => (
                  <li key={g.node_id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onFocusNode(g.node_id)}
                      className="flex-1 truncate text-left text-sm hover:text-primary transition-colors"
                      title={g.label}
                    >
                      {g.label}
                    </button>
                    <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[10px]">{g.degree}</Badge>
                    {g.node_type === "concept" && (
                      <button
                        type="button"
                        onClick={() => openWiki(g.label, neighboursOf(g.node_id))}
                        title="Wiki summary"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Surprising connections */}
          <section>
            <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <ArrowRight className="h-3.5 w-3.5" /> Surprising connections
            </div>
            {surprising.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : (surprising.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No inferred cross-links yet.</p>
            ) : (
              <ul className="space-y-2">
                {(surprising.data ?? []).map((e) => (
                  <li key={e.edge_id} className="rounded-lg border border-border/50 bg-background/50 p-2">
                    <div className="flex items-center gap-1 text-xs font-medium">
                      <button className="truncate hover:text-primary" onClick={() => onFocusNode(e.source)} title={labelFor(e.source, nodes)}>
                        {labelFor(e.source, nodes)}
                      </button>
                      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <button className="truncate hover:text-primary" onClick={() => onFocusNode(e.target)} title={labelFor(e.target, nodes)}>
                        {labelFor(e.target, nodes)}
                      </button>
                    </div>
                    {e.rationale && <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{e.rationale}</p>}
                    <div className="mt-1 flex items-center gap-1.5">
                      <Badge variant="outline" className={cn("h-4 px-1 text-[9px]", e.edge_kind === "INFERRED" && "border-dashed")}>
                        {e.edge_kind}
                      </Badge>
                      {typeof e.confidence === "number" && (
                        <span className="text-[10px] text-muted-foreground">{Math.round(e.confidence * 100)}%</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {isAdmin && (
            <Button
              variant="outline" size="sm" className="w-full gap-2"
              onClick={handleRebuild} disabled={rebuilding}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", rebuilding && "animate-spin")} />
              {rebuilding ? "Rebuilding…" : "Rebuild memory"}
            </Button>
          )}
        </div>
      )}

      <Dialog open={!!wikiTopic} onOpenChange={(o) => { if (!o) setWikiTopic(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> {wikiTopic}
            </DialogTitle>
          </DialogHeader>
          {wikiLoading ? (
            <p className="text-sm text-muted-foreground">Generating summary…</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
              {wikiBody}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
