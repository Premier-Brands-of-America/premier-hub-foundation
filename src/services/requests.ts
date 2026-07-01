import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import { getPreviewViewer } from "@/lib/previewViewer";
import { demoPushNotification } from "@/lib/demoNotificationsStore";
import {
  demoCreateRequest, demoGetRequest, demoListMine,
  demoListDepartment, demoListQueue, demoUpdateRequest,
} from "@/lib/demoRequestsStore";
import type {
  ArtRequest,
  CreateRequestPayload,
  UpdateRequestPatch,
} from "@/types/request";

const TABLE = "requests";

export async function listMyRequests(userId: string): Promise<ArtRequest[]> {
  if (isPreviewEnvironment()) return demoListMine(userId);
  const { data, error } = await supabase
    .from(TABLE).select("*").eq("requester_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ArtRequest[];
}

export async function listDepartmentRequests(departmentId: string): Promise<ArtRequest[]> {
  if (isPreviewEnvironment()) return demoListDepartment(departmentId);
  const { data, error } = await supabase
    .from(TABLE).select("*").eq("department_id", departmentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ArtRequest[];
}

export async function listQueue(): Promise<ArtRequest[]> {
  if (isPreviewEnvironment()) return demoListQueue();
  const { data, error } = await supabase
    .from(TABLE).select("*")
    .not("status", "in", "(complete,archived)")
    .order("priority", { ascending: false })
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as unknown as ArtRequest[];
}

export async function getRequest(id: string): Promise<ArtRequest | null> {
  if (isPreviewEnvironment()) return demoGetRequest(id);
  const { data, error } = await supabase
    .from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as ArtRequest) ?? null;
}

export async function createRequest(payload: CreateRequestPayload): Promise<ArtRequest> {
  if (isPreviewEnvironment()) return demoCreateRequest(payload);
  const { data, error } = await supabase
    .from(TABLE).insert(payload as never).select("*").single();
  if (error) throw error;
  return data as unknown as ArtRequest;
}

export async function updateRequest(id: string, patch: UpdateRequestPatch): Promise<ArtRequest> {
  if (isPreviewEnvironment()) return demoUpdateRequest(id, patch);
  const { data, error } = await supabase
    .from(TABLE).update(patch as never).eq("id", id).select("*").single();
  if (error) throw error;
  return data as unknown as ArtRequest;
}

/**
 * Notify the assigned manager that a new request was routed to them.
 *
 * PRODUCTION: handled entirely by the `assign_manager_and_notify` DB trigger
 * (SECURITY DEFINER, RLS-safe) — nothing to do client-side, so this no-ops.
 * PREVIEW: there is no DB/trigger, so push a demo notification to the current
 * viewer's bell (keyed by their user_id) so the routing→notification flow is
 * observable end-to-end. The manager name/customer are carried in the message.
 */
export function notifyRequestAssignment(request: ArtRequest): void {
  if (!isPreviewEnvironment()) return;
  const viewer = getPreviewViewer();
  if (!viewer) return;
  const meta = request.metadata ?? {};
  const managerEmail = typeof meta.manager_email === "string" ? meta.manager_email : null;
  if (!managerEmail) return; // no manager routed (e.g. full-brief) → nothing to notify
  const customer = typeof meta.customer === "string" ? meta.customer : null;
  demoPushNotification({
    user_id: viewer.userId,
    type: "info",
    title: "Nuevo art request asignado",
    message: customer ? `${request.title} · ${customer}` : request.title,
    link: `/requests/${request.id}`,
  });
}
