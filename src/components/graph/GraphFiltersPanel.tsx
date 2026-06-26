import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import type { GraphFilters, GraphViewFilters, NodeType, RelationType } from "@/types/graph";

const NODE_TYPES: NodeType[] = ["project", "task", "request", "page", "user"];
const RELATION_TYPES: RelationType[] = [
  "owns", "stakeholder", "assigned_to", "belongs_to",
  "relates_to", "blocks", "duplicate_of", "parent_of",
  "mentions", "linked_from",
];

interface Props {
  filters: GraphFilters;
  onChange: (next: GraphFilters) => void;
  view: GraphViewFilters;
  onViewChange: (next: GraphViewFilters) => void;
  /** Distinct status values present in the current graph. */
  statusOptions: string[];
}

export function GraphFiltersPanel({ filters, onChange, view, onViewChange, statusOptions }: Props) {
  const activeTypes = filters.entity_types ?? NODE_TYPES;
  const activeRels = filters.relation_types ?? [];
  const activeStatuses = view.statuses ?? statusOptions;

  const toggleType = (t: NodeType) => {
    const has = activeTypes.includes(t);
    onChange({
      ...filters,
      entity_types: has ? activeTypes.filter((x) => x !== t) : [...activeTypes, t],
    });
  };
  const toggleRel = (r: RelationType) => {
    const has = activeRels.includes(r);
    const next = has ? activeRels.filter((x) => x !== r) : [...activeRels, r];
    onChange({ ...filters, relation_types: next.length ? next : undefined });
  };
  const toggleStatus = (s: string) => {
    const has = activeStatuses.includes(s);
    const next = has ? activeStatuses.filter((x) => x !== s) : [...activeStatuses, s];
    // undefined when every status is active (the "all" state)
    onViewChange({ ...view, statuses: next.length === statusOptions.length ? undefined : next });
  };

  return (
    <Card className="w-64 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
        <Input
          value={view.search ?? ""}
          onChange={(e) => onViewChange({ ...view, search: e.target.value })}
          placeholder="Highlight nodes…"
          className="h-8 text-sm"
        />

        <div className="flex items-center justify-between">
          <Label htmlFor="hide-orphans" className="text-sm cursor-pointer">Hide orphans</Label>
          <Switch
            id="hide-orphans"
            checked={!!view.hideOrphans}
            onCheckedChange={(v) => onViewChange({ ...view, hideOrphans: v })}
          />
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Entity types</p>
          <div className="space-y-1">
            {NODE_TYPES.map((t) => (
              <div key={t} className="flex items-center gap-2">
                <Checkbox
                  id={`et-${t}`}
                  checked={activeTypes.includes(t)}
                  onCheckedChange={() => toggleType(t)}
                />
                <Label htmlFor={`et-${t}`} className="text-sm capitalize cursor-pointer">{t}</Label>
              </div>
            ))}
          </div>
        </div>

        {statusOptions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Status</p>
            <div className="space-y-1">
              {statusOptions.map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <Checkbox
                    id={`st-${s}`}
                    checked={activeStatuses.includes(s)}
                    onCheckedChange={() => toggleStatus(s)}
                  />
                  <Label htmlFor={`st-${s}`} className="text-sm capitalize cursor-pointer">
                    {s.replace(/_/g, " ")}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Relation types</p>
          <div className="space-y-1">
            {RELATION_TYPES.map((r) => (
              <div key={r} className="flex items-center gap-2">
                <Checkbox
                  id={`rt-${r}`}
                  checked={activeRels.includes(r)}
                  onCheckedChange={() => toggleRel(r)}
                />
                <Label htmlFor={`rt-${r}`} className="text-sm cursor-pointer">{r.replace(/_/g, " ")}</Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
