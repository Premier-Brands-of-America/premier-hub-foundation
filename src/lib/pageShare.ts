/**
 * Page-share resolution (Feature 6).
 *
 * Pure logic mirroring the can_view_page() RLS policy so the preview demo path
 * resolves access the same way the database does. Extends the existing
 * private / department / public model with per-person grants (view | edit).
 *
 * Precedence (highest access wins): admin → owner → explicit person share →
 * public → department. Edit implies view.
 */

export type PageVisibility = "private" | "department" | "public";
export type ShareRole = "view" | "edit";
export type PageAccessLevel = "none" | "view" | "edit";

export type PageAccessReason =
  | "admin"
  | "owner"
  | "shared-edit"
  | "shared-view"
  | "public"
  | "department"
  | "none";

export interface PageShareGrant {
  granteeId: string;
  role: ShareRole;
}

export interface PageAccessViewer {
  userId: string;
  isAdmin?: boolean;
  departmentId?: string | null;
}

export interface PageAccessItem {
  ownerId?: string | null;
  visibility: PageVisibility;
  departmentId?: string | null;
  shares?: readonly PageShareGrant[];
}

export interface PageAccessResult {
  level: PageAccessLevel;
  reason: PageAccessReason;
}

export function resolvePageAccess(viewer: PageAccessViewer, page: PageAccessItem): PageAccessResult {
  if (viewer.isAdmin) return { level: "edit", reason: "admin" };
  if (page.ownerId && page.ownerId === viewer.userId) return { level: "edit", reason: "owner" };

  // Explicit per-person grant takes precedence over visibility-derived view.
  const share = page.shares?.find((s) => s.granteeId === viewer.userId);
  if (share) {
    return share.role === "edit"
      ? { level: "edit", reason: "shared-edit" }
      : { level: "view", reason: "shared-view" };
  }

  if (page.visibility === "public") return { level: "view", reason: "public" };
  if (
    page.visibility === "department" &&
    page.departmentId &&
    viewer.departmentId &&
    page.departmentId === viewer.departmentId
  ) {
    return { level: "view", reason: "department" };
  }

  return { level: "none", reason: "none" };
}

export function canViewPage(viewer: PageAccessViewer, page: PageAccessItem): boolean {
  return resolvePageAccess(viewer, page).level !== "none";
}

export function canEditPage(viewer: PageAccessViewer, page: PageAccessItem): boolean {
  return resolvePageAccess(viewer, page).level === "edit";
}

export function filterViewablePages<T extends PageAccessItem>(
  viewer: PageAccessViewer,
  pages: readonly T[],
): T[] {
  return pages.filter((p) => canViewPage(viewer, p));
}
