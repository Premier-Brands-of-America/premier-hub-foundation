import { useQuery } from "@tanstack/react-query";
import { fetchBacklinks } from "@/services/pagesService";
import { useRealtimeInvalidation } from "@/hooks/use-realtime";
import type { BacklinkTargetType } from "@/types/pages";

export function useBacklinks(targetType: BacklinkTargetType, targetId: string | undefined) {
  useRealtimeInvalidation("page_links", ["backlinks"]);
  return useQuery({
    queryKey: ["backlinks", targetType, targetId],
    queryFn: () => fetchBacklinks(targetType, targetId!),
    enabled: !!targetId,
  });
}