import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { GraphFilters, NodeType, RelationType } from "@/types/graph";

const NODE_TYPES: NodeType[] = ["project", "task", "request", "page", "user"];
const RELATION_TYPES: RelationType[] = [
  "owns", "stakeholder", "assigned_to", "belongs_to",
  "relates_to", "blocks", "duplicate_of", "parent_of",
  "mentions", "linked_from",
];

interface Props {
  filters: GraphFilters;
  onChange: (next: GraphFilters) => void;
}

export function GraphFiltersPanel({ filters, onChange }: Props) {
  const activeTypes = filters.entity_types ?? NODE_TYPES;
  const activeRels = filters.relation_types ?? [];

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

  return (
    <Card className="w-64 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
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