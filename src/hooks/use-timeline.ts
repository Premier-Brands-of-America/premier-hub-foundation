import { useQuery } from "@tanstack/react-query";
import { fetchTimeline } from "@/services/timelineService";
import type { TimelineEntityType, TimelineEvent } from "@/types/timeline";

export function useTimeline(from: Date, to: Date, types?: TimelineEntityType[]) {
  const fromIso = from.toISOString().slice(0, 10);
  const toIso = to.toISOString().slice(0, 10);
  const typesHash = (types ?? []).slice().sort().join(",");
  return useQuery<TimelineEvent[]>({
    queryKey: ["timeline", fromIso, toIso, typesHash],
    queryFn: () => fetchTimeline(from, to, types),
  });
}