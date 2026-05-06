export const ATTACHMENT_KINDS = [
  "submission",
  "reference",
  "working",
  "review",
  "approval",
  "final",
] as const;

export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export interface RequestAttachment {
  id: string;
  request_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  kind: AttachmentKind;
  uploaded_by: string;
  created_at: string;
  uploader?: { id: string; full_name: string | null; email: string | null } | null;
}

export const ALLOWED_MIME_EXT = [
  "pdf", "jpg", "jpeg", "png", "webp", "gif",
  "doc", "docx", "ai", "eps", "psd", "indd",
  "zip", "dxf", "dwg", "txt", "rtf", "mp4",
] as const;

export const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100MB

export function slugifyFilename(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return ext ? `${base || "file"}.${ext}` : (base || "file");
}

export function fileExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function isExtAllowed(name: string): boolean {
  return (ALLOWED_MIME_EXT as readonly string[]).includes(fileExt(name));
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}