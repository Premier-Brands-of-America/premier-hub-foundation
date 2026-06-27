import { Card } from "@/components/ui/card";
import { EntityIcon } from "@/components/common/EntityIcon";
import { NODE_COLOR_VAR } from "./graphColors";
import type { NodeType, GraphPayload } from "@/types/graph";

const ENTITY_TYPES: NodeType[] = ["project", "task", "request", "page", "user"];

const ENTITY_LABELS: Record<NodeType, string> = {
  project: "Project",
  task: "Task",
  request: "Request",
  page: "Page",
  user: "Person",
  department: "Department",
};

interface RelationRow {
  label: string;
  dash?: number[];
  weight: number;
  description: string;
}

const RELATION_LEGEND: RelationRow[] = [
  { label: "Ownership / hierarchy", weight: 2, description: "owns, parent of, belongs to" },
  { label: "Collaboration", weight: 1.5, description: "assigned to, stakeholder" },
  { label: "Reference", weight: 1, description: "relates to, mentions, linked from" },
  { label: "Blocking", weight: 2, dash: [4, 2], description: "blocks" },
  { label: "Duplicate", weight: 1, dash: [2, 2], description: "duplicate of" },
];

interface Props {
  /** Optional live counts per node type from the current payload. */
  counts?: Partial<Record<NodeType, number>>;
}

export function GraphLegend({ counts }: Props) {
  return (
    <Card className="p-3 shadow-xl border border-border/60 bg-card/95 backdrop-blur-sm w-48 space-y-3">
      {/* Entity types */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Entity types
        </p>
        <div className="space-y-1">
          {ENTITY_TYPES.map((t) => (
            <div key={t} className="flex items-center gap-2">
              <span
                className="shrink-0 inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: `hsl(var(${NODE_COLOR_VAR[t]}))` }}
              />
              <EntityIcon type={t} className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-xs capitalize flex-1">{ENTITY_LABELS[t]}</span>
              {counts?.[t] != null && (
                <span className="text-[10px] tabular-nums text-muted-foreground font-medium">
                  {counts[t]}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/50" />

      {/* Relation styles */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Relations
        </p>
        <div className="space-y-1.5">
          {RELATION_LEGEND.map((row) => (
            <div key={row.label} className="flex items-center gap-2.5">
              {/* SVG mini line */}
              <svg
                width="28"
                height="10"
                viewBox="0 0 28 10"
                className="shrink-0"
                aria-hidden="true"
              >
                <line
                  x1="2"
                  y1="5"
                  x2="26"
                  y2="5"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={row.weight}
                  strokeDasharray={row.dash ? row.dash.join(" ") : undefined}
                  strokeLinecap="round"
                />
              </svg>
              <div className="min-w-0">
                <p className="text-[10px] leading-tight">{row.label}</p>
                <p className="text-[9px] text-muted-foreground leading-tight truncate">{row.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
