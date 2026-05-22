import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { archivePage, fetchAncestors, fetchPage, savePageBody, updatePageMeta, updatePageTitle } from "@/services/pagesService";
import { useRealtimeInvalidation } from "@/hooks/use-realtime";
import type { Page, PageVisibility } from "@/types/pages";

export function usePage(id: string | undefined) {
  useRealtimeInvalidation("pages", ["page"]);
  return useQuery({
    queryKey: ["page", id],
    queryFn: () => fetchPage(id!),
    enabled: !!id,
  });
}

export function usePageAncestors(id: string | undefined) {
  return useQuery({
    queryKey: ["pageAncestors", id],
    queryFn: () => fetchAncestors(id!),
    enabled: !!id,
  });
}

export function useSavePageBody(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body_md: string) => savePageBody(id!, body_md),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["page", id] });
      qc.invalidateQueries({ queryKey: ["backlinks"] });
    },
  });
}

export function useUpdatePageTitle(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => updatePageTitle(id!, title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["page", id] });
      qc.invalidateQueries({ queryKey: ["pageTree"] });
    },
  });
}

export function useUpdatePageMeta(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<Page, "icon" | "cover_url" | "visibility" | "department_id">>) =>
      updatePageMeta(id!, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["page", id] });
      qc.invalidateQueries({ queryKey: ["pageTree"] });
    },
  });
}

export function useArchivePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archivePage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pageTree"] });
    },
  });
}

export type { Page, PageVisibility };