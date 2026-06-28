import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRequest,
  getRequest,
  listDepartmentRequests,
  listMyRequests,
  listQueue,
  updateRequest,
} from "@/services/requests";
import type { CreateRequestPayload, UpdateRequestPatch } from "@/types/request";
import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";

export const requestKeys = {
  all: ["requests"] as const,
  mine: (userId: string | null | undefined) =>
    ["requests", "mine", userId] as const,
  department: (deptId: string | null | undefined) =>
    ["requests", "department", deptId] as const,
  queue: () => ["requests", "queue"] as const,
  detail: (id: string) => ["requests", "detail", id] as const,
};

export function useMyRequests(userId: string | null | undefined) {
  return useQuery({
    queryKey: requestKeys.mine(userId),
    queryFn: () => listMyRequests(userId as string),
    enabled: Boolean(userId),
  });
}

export function useDepartmentRequests(deptId: string | null | undefined) {
  return useQuery({
    queryKey: requestKeys.department(deptId),
    queryFn: () => listDepartmentRequests(deptId as string),
    enabled: Boolean(deptId),
  });
}

export function useQueue() {
  return useQuery({
    queryKey: requestKeys.queue(),
    queryFn: () => listQueue(),
  });
}

export function useRequest(id: string | null | undefined) {
  return useQuery({
    queryKey: requestKeys.detail(id ?? ""),
    queryFn: () => getRequest(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateRequestPayload) => {
      if (isPreviewEnvironment()) {
        // Preview/demo: no live DB. Simulate a successful submission so the
        // whole request flow is testable without `supabase db push`.
        const n = Math.floor(1000 + (Date.now() % 9000));
        return {
          id: `demo-req-${Date.now()}`,
          request_number: `ART-PREVIEW-${n}`,
          status: "submitted",
          created_at: new Date().toISOString(),
          ...(payload as Record<string, unknown>),
        } as Awaited<ReturnType<typeof createRequest>>;
      }
      const created = await createRequest(payload);
      // Fire-and-forget SharePoint folder provisioning
      supabase.functions
        .invoke("sharepoint-provision", { body: { request_id: created.id } })
        .catch((e) => console.warn("sharepoint-provision failed", e));
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: requestKeys.all });
    },
  });
}

export function useUpdateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateRequestPatch }) =>
      updateRequest(id, patch),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: requestKeys.all });
      if (data?.id) {
        qc.invalidateQueries({ queryKey: requestKeys.detail(data.id) });
      }
    },
  });
}