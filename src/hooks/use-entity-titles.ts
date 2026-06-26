import { useQuery } from "@tanstack/react-query";
import { resolveEntities } from "@/services/relationsService";
import type { EntityType } from "@/types/relations";

/** Batch-resolve titles for the `[[ ]]` refs in a page body, keyed `type:id`. */
export function useEntityTitles(refs: Array<{ type: EntityType; id: string }>) {
  const key = refs.map((r) => `${r.type}:${r.id}`).sort().join(",");
  return useQuery({
    queryKey: ["entityTitles", key],
    queryFn: () => resolveEntities(refs),
    enabled: refs.length > 0,
    staleTime: 60_000,
  });
}
