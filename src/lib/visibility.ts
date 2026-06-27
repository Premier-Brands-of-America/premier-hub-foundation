/**
 * Client-side visibility adapters (Feature 5).
 *
 * Maps project / task / page rows onto the pure, tested resolvers in acl.ts and
 * pageShare.ts, so the preview demo path filters items the same way the RLS
 * policies in 20260627150000_feature5_acl_visibility.sql do server-side.
 *
 * Keep this in sync with that migration: text comments reference the SQL rules.
 */

import { canViewItem, type AclViewer } from "./acl";
import { canViewPage as resolveCanViewPage, type PageShareGrant, type PageVisibility } from "./pageShare";

export interface VisibilityViewer {
  userId: string;
  isAdmin: boolean;
  departmentId: string | null;
  /** user_ids of the viewer's direct reports (M365 hierarchy, one level). */
  directReportIds: string[];
}

const toAcl = (v: VisibilityViewer): AclViewer => ({
  userId: v.userId,
  isAdmin: v.isAdmin,
  directReportIds: v.directReportIds,
});

/** projects: owner / stakeholder + public + admin + manager-of-report. */
export function canViewProjectRow(
  viewer: VisibilityViewer,
  project: { owner_id: string; visibility: string },
  stakeholderUserIds: readonly string[] = [],
): boolean {
  return canViewItem(toAcl(viewer), {
    ownerId: project.owner_id,
    isPublic: project.visibility === "public",
    stakeholderIds: stakeholderUserIds,
  });
}

/** tasks: owner (user_id) + public + admin + manager-of-owner. */
export function canViewTaskRow(
  viewer: VisibilityViewer,
  task: { user_id: string; visibility?: string | null },
): boolean {
  return canViewItem(toAcl(viewer), {
    ownerId: task.user_id,
    isPublic: task.visibility === "public",
  });
}

/** pages: owner + per-person shares + public + department + admin (+ manager-of-owner). */
export function canViewPageRow(
  viewer: VisibilityViewer,
  page: {
    owner_id: string | null;
    visibility: string;
    department_id?: string | null;
    shares?: readonly PageShareGrant[];
  },
): boolean {
  // Manager-of-owner is a project/task-style rule; pages also honor it.
  if (page.owner_id && viewer.directReportIds.includes(page.owner_id)) return true;
  return resolveCanViewPage(
    { userId: viewer.userId, isAdmin: viewer.isAdmin, departmentId: viewer.departmentId },
    {
      ownerId: page.owner_id,
      visibility: page.visibility as PageVisibility,
      departmentId: page.department_id ?? null,
      shares: page.shares,
    },
  );
}
