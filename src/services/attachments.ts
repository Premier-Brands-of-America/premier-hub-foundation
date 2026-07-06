import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import type { AttachmentKind, RequestAttachment } from "@/types/attachment";

export const BUCKET = "art-requests";

export async function listAttachments(
  requestId: string,
  kind?: AttachmentKind,
): Promise<RequestAttachment[]> {
  // Preview mode is fully self-contained: demo requests have no rows in the
  // live DB, and querying it with demo ids produces 400s that then render as
  // a fake "No attachments yet." empty state.
  if (isPreviewEnvironment()) return [];
  let q = supabase
    .from("request_attachments")
    .select("*, uploader:profiles!request_attachments_uploaded_by_fkey(id, full_name, email)")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });
  if (kind) q = q.eq("kind", kind);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as RequestAttachment[];
}

export async function getMyProfileId(): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", uid)
    .single();
  if (error) throw error;
  return data.id;
}

export async function uploadAttachment(params: {
  requestId: string;
  kind: AttachmentKind;
  file: File;
  storagePath: string;
  onProgress?: (pct: number) => void;
}): Promise<RequestAttachment> {
  const { requestId, kind, file, storagePath } = params;
  // TODO: integrate Defender for Cloud scan via Microsoft Graph in Prompt 10/30

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });
  if (upErr) throw upErr;

  const profileId = await getMyProfileId();
  const { data, error } = await supabase
    .from("request_attachments")
    .insert({
      request_id: requestId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      kind,
      uploaded_by: profileId,
    })
    .select()
    .single();
  if (error) {
    // best-effort cleanup if metadata insert fails
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }
  return data as unknown as RequestAttachment;
}

export async function createSignedUrl(path: string, expiresIn = 60): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteAttachment(att: RequestAttachment): Promise<void> {
  const { error } = await supabase.from("request_attachments").delete().eq("id", att.id);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([att.storage_path]);
}