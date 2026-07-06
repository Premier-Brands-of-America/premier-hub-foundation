import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { departmentColorVar } from "@/components/graph/graphColors";
import type { GraphFilters, GraphMode, GraphViewFilters, NodeType, RelationType } from "@/types/graph";

const NODE_TYPES: NodeType[] = ["project", "task", "request", "page", "user"];
const RELATION_TYPES: RelationType[] = [
  "owns", "stakeholder", "assigned_to", "belongs_to",
  "relates_to", "blocks", "duplicate_of", "parent_of",
  "mentions", "linked_from", "reports_to", "member_of",
];

interface Props {
  filters: GraphFilters;
  onChange: (next: GraphFilters) => void;
  view: GraphViewFilters;
  onViewChange: (next: GraphViewFilters) => void;
  /** Distinct status values present in the current graph. */
  statusOptions: string[];
  /** Which graph is shown — drives which filter sections make sense. */
  mode: GraphMode;
  /** Entity types actually present in the current graph (only these are offered). */
  presentTypes: NodeType[];
  /** Relation types actually present in the current graph. */
  presentRels: RelationType[];
  /** Departments present (org mode) → show/hide toggles that recolor the tree. */
  departments?: string[];
}

/**
 * Mode-aware filter panel. It only offers controls that DO something on the
 * graph currently shown: entity-type / relation-type checkboxes render only for
 * types present in the data (so Org — which is only people + reports_to — no
 * longer shows dead "Project/Task" checkboxes), and Org gets a Departments
 * section instead. A section with fewer than two options is hidden (nothing to
 * filter).
 */
export function GraphFiltersPanel({
  filters, onChange, view, onViewChange, statusOptions, mode, presentTypes, presentRels, departments,
}: Props) {
  const typeOpts = NODE_TYPES.filter((t) => presentTypes.includes(t));
  const relOpts = RELATION_TYPES.filter((r) => presentRels.includes(r));
  const activeTypes = filters.entity_types ?? NODE_TYPES;
  const activeRels = filters.relation_types ?? [];
  const activeStatuses = view.statuses ?? statusOptions;
  const hiddenDepts = view.hiddenDepartments ?? [];

  const toggleType = (t: NodeType) => {
    // Operate over the PRESENT types so toggling never resurrects a type that
    // isn't in the graph. Start from all present types when unset.
    const base = filters.entity_types ?? typeOpts;
    const has = base.includes(t);
    onChange({ ...filters, entity_types: has ? base.filter((x) => x !== t) : [...base, t] });
  };
  const toggleRel = (r: RelationType) => {
    const has = activeRels.includes(r);
    const next = has ? activeRels.filter((x) => x !== r) : [...activeRels, r];
    onChange({ ...filters, relation_types: next.length ? next : undefined });
  };
  const toggleStatus = (s: string) => {
    const has = activeStatuses.includes(s);
    const next = has ? activeStatuses.filter((x) => x !== s) : [...activeStatuses, s];
    onViewChange({ ...view, statuses: next.length === statusOptions.length ? undefined : next });
  };
  const toggleDept = (d: string) => {
    const has = hiddenDepts.includes(d);
    const next = has ? hiddenDepts.filter((x) => x !== d) : [...hiddenDepts, d];
    onViewChange({ ...view, hiddenDepartments: next.length ? next : undefined });
  };

  const searchPlaceholder = mode === "org" ? "Highlight a person…" : "Highlight nodes…";

  return (
    <Card className="w-64 shadow-md bg-card/95 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
        <Input
          value={view.search ?? ""}
          onChange={(e) => onViewChange({ ...view, search: e.target.value })}
          placeholder={searchPlaceholder}
          className="h-8 text-sm"
        />

        {/* Orphans only make sense where a node can be unlinked (not the org tree). */}
        {mode !== "org" && (
          <div className="flex items-center justify-between">
            <Label htmlFor="hide-orphans" className="text-sm cursor-pointer">Hide unlinked</Label>
            <Switch
              id="hide-orphans"
              checked={!!view.hideOrphans}
              onCheckedChange={(v) => onViewChange({ ...view, hideOrphans: v })}
            />
          </div>
        )}

        {/* Departments (org) — show/hide recolors and prunes the tree. */}
        {departments && departments.length > 1 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Departments</p>
            <div className="space-y-1">
              {departments.map((d) => (
                <div key={d} className="flex items-center gap-2">
                  <Checkbox id={`dp-${d}`} checked={!hiddenDepts.includes(d)} onCheckedChange={() => toggleDept(d)} />
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: `hsl(var(${departmentColorVar(d)}))` }}
                    aria-hidden
                  />
                  <Label htmlFor={`dp-${d}`} className="text-sm cursor-pointer">{d}</Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entity types — only when the graph actually mixes types. */}
        {typeOpts.length > 1 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Entity types</p>
            <div className="space-y-1">
              {typeOpts.map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <Checkbox id={`et-${t}`} checked={activeTypes.includes(t)} onCheckedChange={() => toggleType(t)} />
                  <Label htmlFor={`et-${t}`} className="text-sm capitalize cursor-pointer">{t}</Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {statusOptions.length > 1 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Status</p>
            <div className="space-y-1">
              {statusOptions.map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <Checkbox id={`st-${s}`} checked={activeStatuses.includes(s)} onCheckedChange={() => toggleStatus(s)} />
                  <Label htmlFor={`st-${s}`} className="text-sm capitalize cursor-pointer">{s.replace(/_/g, " ")}</Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Relation types — only when more than one kind of edge is present. */}
        {relOpts.length > 1 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Relation types</p>
            <div className="space-y-1">
              {relOpts.map((r) => (
                <div key={r} className="flex items-center gap-2">
                  <Checkbox id={`rt-${r}`} checked={activeRels.includes(r)} onCheckedChange={() => toggleRel(r)} />
                  <Label htmlFor={`rt-${r}`} className="text-sm cursor-pointer">{r.replace(/_/g, " ")}</Label>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
