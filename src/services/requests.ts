import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
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
