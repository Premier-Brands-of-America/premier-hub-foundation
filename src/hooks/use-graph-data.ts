import { useQuery } from "@tanstack/react-query";
import { fetchGraph } from "@/services/graphService";
import type { GraphFilters, GraphPayload } from "@/types/graph";

function stableHash(f: GraphFilters): string {
  const obj = {
    et: (f.entity_types ?? []).slice().sort(),
    rt: (f.relation_types ?? []).slice().sort(),
    d: f.department_id ?? "",
    ct: f.center_type ?? "", ci: f.center_id ?? "", dp: f.depth ?? 2,
    lim: f.limit ?? 500,
  };
  return JSON.stringify(obj);
}

export function useGraphData(filters: GraphFilters) {
  return useQuery<GraphPayload>({
    queryKey: ["graph", stableHash(filters)],
    queryFn: () => fetchGraph(filters),
    staleTime: 30_000,
  });
}