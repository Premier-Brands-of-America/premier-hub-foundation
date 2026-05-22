import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRelations } from "@/hooks/use-relations";
import { RelationChip } from "./RelationChip";
import { RelationPicker } from "./RelationPicker";
import { RELATION_TYPES, type EntityType, type Relation, type RelationRef, type RelationType } from "@/types/relations";

interface Props {
  ownerRef: RelationRef;
  editable?: boolean;
  pickableTypes?: EntityType[];
}

const RELATION_LABEL: Record<RelationType, string> = {
  relates_to: "Relates to",
  blocks: "Blocks",
  duplicate_of: "Duplicate of",
  parent_of: "Parent of",
  belongs_to: "Belongs to",
  mentions: "Mentions",
};

export function RelationsSection({
  ownerRef,
  editable = false,
  pickableTypes = ["project", "task", "request"],
}: Props) {
  const { all, isLoading, addRelation, removeRelation } = useRelations(
    ownerRef.entityType,
    ownerRef.entityId,
  );
  const [relationType, setRelationType] = useState<RelationType>("relates_to");

  const grouped = useMemo(() => {
    const m = new Map<RelationType, Relation[]>();
    for (const r of all) {
      if (!m.has(r.relation_type)) m.set(r.relation_type, []);
      m.get(r.relation_type)!.push(r);
    }
    return m;
  }, [all]);

  const excludeIds = useMemo(() => [ownerRef.entityId, ...all.map((r) => r.other_id)], [ownerRef.entityId, all]);

  const handlePick = async (v: RelationRef | RelationRef[]) => {
    const ref = Array.isArray(v) ? v[0] : v;
    if (!ref) return;
    try {
      await addRelation({
        targetType: ref.entityType,
        targetId: ref.entityId,
        relationType,
      });
      toast.success(`Linked ${ref.title}`);
    } catch (e) {
      toast.error((e as Error).message || "Failed to link");
    }
  };

  const handleRemove = async (rel: Relation) => {
    const snapshot = rel;
    try {
      await removeRelation(rel);
      toast.success("Relation removed", {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await addRelation({
                targetType: snapshot.other_type,
                targetId: snapshot.other_id,
                relationType: snapshot.relation_type,
              });
            } catch {
              toast.error("Undo failed");
            }
          },
        },
      });
    } catch (e) {
      toast.error((e as Error).message || "Failed to remove");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Related</CardTitle>
          {editable && (
            <div className="flex items-center gap-2">
              <Select value={relationType} onValueChange={(v) => setRelationType(v as RelationType)}>
                <SelectTrigger className="h-7 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATION_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {RELATION_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <RelationPicker
                entityTypes={pickableTypes}
                excludeIds={excludeIds}
                onChange={handlePick}
                placeholder="+ Add relation"
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!isLoading && all.length === 0 && (
          <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
            {editable ? "No relations yet — link a project, task, or request." : "No relations."}
          </div>
        )}
        {!isLoading && all.length > 0 && (
          <div className="space-y-3">
            {[...grouped.entries()].map(([type, rels]) => (
              <div key={type} className="space-y-1.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {RELATION_LABEL[type]}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {rels.map((r) => (
                    <RelationChip
                      key={r.id}
                      ref_={{
                        entityType: r.other_type,
                        entityId: r.other_id,
                        title: r.other_title ?? "(untitled)",
                      }}
                      onRemove={editable ? () => handleRemove(r) : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}