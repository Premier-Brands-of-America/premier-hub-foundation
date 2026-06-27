/**
 * Preview-only: the currently signed-in mock viewer, mirrored to localStorage.
 *
 * In preview there is no Supabase JWT, so the service layer (which isn't a React
 * component) can't read auth context. PreviewAuthContext writes the selected
 * mock profile here on sign-in; services read it to scope the ACL demo path the
 * same way RLS would scope real data.
 */

const KEY = "phv2:preview-viewer";

export interface PreviewViewer {
  userId: string;
  email: string;
  isAdmin: boolean;
  departmentId: string | null;
  managerEmail: string | null;
}

export function setPreviewViewer(v: PreviewViewer | null) {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function getPreviewViewer(): PreviewViewer | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PreviewViewer) : null;
  } catch {
    return null;
  }
}
