import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { EntityIcon } from "@/components/common/EntityIcon";
import { NODE_COLOR_VAR, departmentColorVar } from "./graphColors";
import type { NodeType } from "@/types/graph";
import type { EntityType } from "@/types/relations";

const ENTITY_TYPES: NodeType[] = ["project", "task", "request", "page", "user", "concept"];

const ENTITY_LABELS: Record<NodeType, string> = {
  project: "Project",
  task: "Task",
  request: "Request",
  page: "Page",
  user: "Person",
  department: "Department",
  concept: "Concept",
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
  /** Show the "Person size = workload" section (Network mode). */
  showWorkload?: boolean;
  /** Department names present in the payload — renders a department color key (Org mode). */
  departments?: string[];
}

export function GraphLegend({ counts, showWorkload, departments }: Props) {
  // Org mode replaces the standalone department bubbles with colored person nodes
  // + this key. Only show the entity "Person" swatch and the department key there.
  const isOrg = departments && departments.length > 0;
  const entityTypes = isOrg ? (["user"] as NodeType[]) : ENTITY_TYPES;

  return (
    <Card className="p-3 shadow-md bg-card/95 backdrop-blur-sm w-48 space-y-3">
      {/* Entity types */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Entity types
        </p>
        <div className="space-y-1">
          {entityTypes.map((t) => (
            <div key={t} className="flex items-center gap-2">
              <span
                className="shrink-0 inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: `hsl(var(${NODE_COLOR_VAR[t]}))` }}
              />
              {t === "concept" ? (
                <Sparkles className="h-3 w-3 text-muted-foreground shrink-0" />
              ) : (
                <EntityIcon type={t as EntityType} className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
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

      {/* Department color key (Org mode) — people are tinted by department. */}
      {isOrg && (
        <>
          <div className="border-t border-border/50" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Departments
            </p>
            <div className="space-y-1">
              {departments!.map((d) => (
                <div key={d} className="flex items-center gap-2">
                  <span
                    className="shrink-0 inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: `hsl(var(${departmentColorVar(d)}))` }}
                  />
                  <span className="text-xs flex-1 truncate" title={d}>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Relation styles (hidden in the simplified org view) */}
      {!isOrg && (
        <>
          <div className="border-t border-border/50" />
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
        </>
      )}

      {/* Person size = workload (Network mode) */}
      {showWorkload && (
        <>
          <div className="border-t border-border/50" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Person size = workload
            </p>
            <div className="flex items-center gap-3">
              <span
                className="inline-block rounded-full bg-[hsl(var(--entity-person))]"
                style={{ width: 8, height: 8 }}
              />
              <span
                className="inline-block rounded-full bg-[hsl(var(--entity-person))] ring-1 ring-[hsl(var(--destructive))]"
                style={{ width: 18, height: 18 }}
              />
              <span className="text-[10px] leading-tight text-muted-foreground">
                Bigger = more open points. Vermilion ring = over capacity.
              </span>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
