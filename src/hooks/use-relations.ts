import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import * as relationsService from "@/services/relationsService";
import type { EntityType, Relation, RelationType } from "@/types/relations";

export const relationKeys = {
  all: ["relations"] as const,
  list: (type: EntityType, id: string) => ["relations", type, id] as const,
};

export function useRelations(ownerType: EntityType, ownerId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: relationKeys.list(ownerType, ownerId ?? ""),
    queryFn: () => relationsService.listRelations(ownerType, ownerId as string),
    enabled: Boolean(ownerId),
    staleTime: 60_000,
  });

  const outgoing = useMemo(() => (query.data ?? []).filter((r) => r.direction === "outgoing"), [query.data]);
  const incoming = useMemo(() => (query.data ?? []).filter((r) => r.direction === "incoming"), [query.data]);

  const invalidatePair = (a: { type: EntityType; id: string }, b: { type: EntityType; id: string }) => {
    qc.invalidateQueries({ queryKey: relationKeys.list(a.type, a.id) });
    qc.invalidateQueries({ queryKey: relationKeys.list(b.type, b.id) });
    qc.invalidateQueries({ queryKey: ["graph"] });
    if (a.type === "project") qc.invalidateQueries({ queryKey: ["activity", "project", a.id] });
    if (a.type === "task") qc.invalidateQueries({ queryKey: ["activity", "task", a.id] });
  };

  const addMutation = useMutation({
    mutationFn: (input: {
      targetType: EntityType;
      targetId: string;
      relationType: RelationType;
    }) =>
      relationsService.addRelation({
        sourceType: ownerType,
        sourceId: ownerId as string,
        targetType: input.targetType,
        targetId: input.targetId,
        relationType: input.relationType,
      }),
    onSuccess: (_id, vars) => {
      invalidatePair({ type: ownerType, id: ownerId as string }, { type: vars.targetType, id: vars.targetId });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (rel: Relation) => relationsService.removeRelation(rel.id),
    onSuccess: (_v, rel) => {
      invalidatePair({ type: ownerType, id: ownerId as string }, { type: rel.other_type, id: rel.other_id });
    },
  });

  const bulkAddMutation = useMutation({
    mutationFn: (
      pairs: Array<{ targetType: EntityType; targetId: string; relationType: RelationType }>,
    ) =>
      relationsService.bulkAddRelations(
        pairs.map((p) => ({
          sourceType: ownerType,
          sourceId: ownerId as string,
          targetType: p.targetType,
          targetId: p.targetId,
          relationType: p.relationType,
        })),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: relationKeys.list(ownerType, ownerId as string) });
      qc.invalidateQueries({ queryKey: ["graph"] });
    },
  });

  // Realtime — trailing debounce
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (isPreviewEnvironment() || !ownerId) return;
    const ch = supabase
      .channel(`realtime-entity_relations-${ownerType}-${ownerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "entity_relations" }, () => {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => {
          qc.invalidateQueries({ queryKey: relationKeys.all });
          qc.invalidateQueries({ queryKey: ["graph"] });
        }, 300);
      })
      .subscribe();
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      supabase.removeChannel(ch);
    };
  }, [ownerType, ownerId, qc]);

  return {
    outgoing,
    incoming,
    all: query.data ?? [],
    isLoading: query.isLoading,
    addRelation: addMutation.mutateAsync,
    removeRelation: removeMutation.mutateAsync,
    bulkAdd: bulkAddMutation.mutateAsync,
  };
}