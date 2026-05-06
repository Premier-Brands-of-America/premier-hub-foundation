import { supabase } from "@/integrations/supabase/client";
import type {
  ArtRequest,
  CreateRequestPayload,
  UpdateRequestPatch,
} from "@/types/request";

const TABLE = "requests";

export async function listMyRequests(userId: string): Promise<ArtRequest[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("requester_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ArtRequest[];
}

export async function listDepartmentRequests(
  departmentId: string,
): Promise<ArtRequest[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("department_id", departmentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ArtRequest[];
}

export async function listQueue(): Promise<ArtRequest[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .not("status", "in", "(complete,archived)")
    .order("priority", { ascending: false })
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as unknown as ArtRequest[];
}

export async function getRequest(id: string): Promise<ArtRequest | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ArtRequest) ?? null;
}

export async function createRequest(
  payload: CreateRequestPayload,
): Promise<ArtRequest> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as ArtRequest;
}

export async function updateRequest(
  id: string,
  patch: UpdateRequestPatch,
): Promise<ArtRequest> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as ArtRequest;
}