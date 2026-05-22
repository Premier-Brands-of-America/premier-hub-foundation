import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPage, fetchPageTree } from "@/services/pagesService";
import { useRealtimeInvalidation } from "@/hooks/use-realtime";
import type { PageVisibility } from "@/types/pages";

export function usePageTree(rootId?: string) {
  useRealtimeInvalidation("pages", ["pageTree"]);
  return useQuery({
    queryKey: ["pageTree", rootId ?? "root"],
    queryFn: () => fetchPageTree(rootId),
  });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; parent_id?: string | null; visibility?: PageVisibility }) =>
      createPage(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pageTree"] });
    },
  });
}