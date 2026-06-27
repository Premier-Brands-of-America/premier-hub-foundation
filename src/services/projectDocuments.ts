import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import { getPreviewViewer } from "@/lib/previewViewer";
import { DIRECTORY_PEOPLE } from "@/lib/directory";
import type { ProjectDocument } from "@/types/projects";

const IS_PREVIEW = isPreviewEnvironment();
const BUCKET = "project-documents";
export const MAX_DOCUMENT_BYTES = 26214400; // 25MB, matches the bucket limit

// ─── Preview mock store ───
let mockDocs: ProjectDocument[] = [];
let docCounter = 1;
const seededProjects = new Set<string>();

const SAMPLE_TXT = "data:text/plain;base64,UHJlbWllciBIdWIgZGVtbyBkb2N1bWVudCDigJQgcHJvamVjdCBicmllZi4=";
const SAMPLE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function uploaderName(userId: string): string {
  const viewer = getPreviewViewer();
  if (viewer && userId === viewer.userId) return "You";
  return DIRECTORY_PEOPLE.find((p) => p.user_id === userId)?.full_name ?? "Teammate";
}

/** Seed a couple of demo documents for the ACL demo projects so the section is clickable. */
function seedDemoDocs(projectId: string) {
  if (!IS_PREVIEW || seededProjects.has(projectId)) return;
  seededProjects.add(projectId);
  if (!projectId.startsWith("demo-acl-")) return;
  const now = new Date().toISOString();
  mockDocs.push(
    {
      id: `demo-doc-${docCounter++}`,
      project_id: projectId,
      uploaded_by: getPreviewViewer()?.userId ?? "demo-user-other",
      file_name: "Creative brief.txt",
      file_type: "text/plain",
      size_bytes: 5400,
      storage_path: `${projectId}/creative-brief.txt`,
      created_at: now,
      preview_data_url: SAMPLE_TXT,
    },
    {
      id: `demo-doc-${docCounter++}`,
      project_id: projectId,
      uploaded_by: "demo-user-report",
      file_name: "Moodboard.png",
      file_type: "image/png",
      size_bytes: 91200,
      storage_path: `${projectId}/moodboard.png`,
      created_at: now,
      preview_data_url: SAMPLE_PNG,
    },
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function listProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
  if (IS_PREVIEW) {
    seedDemoDocs(projectId);
    return mockDocs
      .filter((d) => d.project_id === projectId)
      .map((d) => ({ ...d, uploader_name: uploaderName(d.uploaded_by) }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const { data, error } = await supabase
    .from("project_documents")
    .select("id, project_id, uploaded_by, file_name, file_type, size_bytes, storage_path, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const docs = (data ?? []) as ProjectDocument[];
  if (docs.length === 0) return [];
  const ids = [...new Set(docs.map((d) => d.uploaded_by))];
  const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
  const byId = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));
  return docs.map((d) => ({ ...d, uploader_name: byId.get(d.uploaded_by) ?? null }));
}

export async function uploadProjectDocument(
  projectId: string,
  userId: string,
  file: File,
): Promise<ProjectDocument> {
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error("File exceeds the 25MB limit.");
  }
  if (IS_PREVIEW) {
    const dataUrl = await readFileAsDataUrl(file);
    const doc: ProjectDocument = {
      id: `mock-doc-${docCounter++}`,
      project_id: projectId,
      uploaded_by: userId,
      file_name: file.name,
      file_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      storage_path: `${projectId}/${file.name}`,
      created_at: new Date().toISOString(),
      preview_data_url: dataUrl,
    };
    mockDocs.unshift(doc);
    return { ...doc, uploader_name: uploaderName(userId) };
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${projectId}/${Date.now()}-${safeName}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from("project_documents")
    .insert({
      project_id: projectId,
      uploaded_by: userId,
      file_name: file.name,
      file_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      storage_path: path,
    })
    .select()
    .single();
  if (error) {
    // best-effort cleanup of the orphaned object
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return data as ProjectDocument;
}

export async function removeProjectDocument(doc: ProjectDocument): Promise<void> {
  if (IS_PREVIEW) {
    mockDocs = mockDocs.filter((d) => d.id !== doc.id);
    return;
  }
  await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  const { error } = await supabase.from("project_documents").delete().eq("id", doc.id);
  if (error) throw error;
}

/** Returns a URL usable to open/download the document (data-URL in preview, signed URL in real mode). */
export async function getProjectDocumentUrl(doc: ProjectDocument): Promise<string | null> {
  if (IS_PREVIEW) return doc.preview_data_url ?? null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, 3600);
  if (error) return null;
  return data.signedUrl;
}
