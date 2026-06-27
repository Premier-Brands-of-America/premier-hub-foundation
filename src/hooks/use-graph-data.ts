import { useQuery } from "@tanstack/react-query";
import { fetchGraphFor } from "@/services/graphService";
import type { GraphFilters, GraphMode, GraphPayload } from "@/types/graph";

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

export function useGraphData(filters: GraphFilters, mode: GraphMode = "network") {
  return useQuery<GraphPayload>({
    queryKey: ["graph", mode, stableHash(filters)],
    queryFn: () => fetchGraphFor(mode, filters),
    staleTime: 30_000,
  });
}
