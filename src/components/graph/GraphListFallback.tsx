import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EntityIcon } from "@/components/common/EntityIcon";
import type { GraphPayload, GraphNode } from "@/types/graph";

interface Props {
  data: GraphPayload;
  onNodeClick: (n: GraphNode) => void;
}

export function GraphListFallback({ data, onNodeClick }: Props) {
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, GraphNode[]>();
  for (const e of data.edges) {
    const s = typeof e.source === "string" ? e.source : (e.source as unknown as GraphNode).id;
    const t = typeof e.target === "string" ? e.target : (e.target as unknown as GraphNode).id;
    const sn = byId.get(s); const tn = byId.get(t);
    if (sn && tn) {
      if (!adjacency.has(s)) adjacency.set(s, []);
      adjacency.get(s)!.push(tn);
    }
  }

  return (
    <div className="space-y-3 p-3">
      {data.nodes.map((n) => (
        <Card key={n.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <EntityIcon type={n.type} className="h-4 w-4" />
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => onNodeClick(n)}
              >
                {n.label}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {(adjacency.get(n.id) ?? []).map((nb) => (
              <div key={nb.id} className="flex items-center gap-2 py-0.5">
                <EntityIcon type={nb.type} className="h-3 w-3" />
                <span>{nb.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}