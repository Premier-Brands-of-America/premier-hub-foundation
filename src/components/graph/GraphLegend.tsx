import { Card } from "@/components/ui/card";
import { EntityIcon } from "@/components/common/EntityIcon";
import { NODE_COLOR_VAR } from "./graphColors";
import type { NodeType } from "@/types/graph";

const ITEMS: NodeType[] = ["project", "task", "request", "page", "user"];

export function GraphLegend() {
  return (
    <Card className="p-3 shadow-lg space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Legend</p>
      {ITEMS.map((t) => (
        <div key={t} className="flex items-center gap-2 text-xs">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: `hsl(var(${NODE_COLOR_VAR[t]}))` }}
          />
          <EntityIcon type={t} className="h-3.5 w-3.5" />
          <span className="capitalize">{t}</span>
        </div>
      ))}
    </Card>
  );
}