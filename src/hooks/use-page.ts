import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  archivePage, fetchAncestors, fetchPage, savePageBody, updatePageMeta, updatePageTitle,
  fetchPageShares, addPageShare, removePageShare, updatePageShareRole,
} from "@/services/pagesService";
import { useRealtimeInvalidation } from "@/hooks/use-realtime";
import type { Page, PageVisibility, PageShareRole } from "@/types/pages";

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

export function usePageShares(pageId: string | undefined) {
  return useQuery({
    queryKey: ["pageShares", pageId],
    queryFn: () => fetchPageShares(pageId!),
    enabled: !!pageId,
  });
}

export function usePageShareMutations(pageId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["pageShares", pageId] });
    qc.invalidateQueries({ queryKey: ["pageTree"] });
    qc.invalidateQueries({ queryKey: ["page", pageId] });
  };
  const add = useMutation({
    mutationFn: ({ granteeUserId, role }: { granteeUserId: string; role: PageShareRole }) =>
      addPageShare(pageId!, granteeUserId, role),
    onSuccess: invalidate,
  });
  const updateRole = useMutation({
    mutationFn: ({ shareId, role }: { shareId: string; role: PageShareRole }) =>
      updatePageShareRole(shareId, role),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (shareId: string) => removePageShare(shareId),
    onSuccess: invalidate,
  });
  return { add, updateRole, remove };
}

export type { Page, PageVisibility };