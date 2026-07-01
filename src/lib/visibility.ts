/**
 * Client-side visibility adapters (Feature 5 + break-glass admin access).
 *
 * Maps project / task / page rows onto the pure, tested resolvers in acl.ts and
 * pageShare.ts, so the preview demo path filters items the same way the RLS
 * policies do server-side.
 *
 * Break-glass: admins no longer see others' private content passively (matching
 * production, where the is_admin bypass in the view helpers was replaced by a
 * time-boxed grant). An admin's power over a SPECIFIC item is unlocked only by an
 * active demo grant — otherwise they see just own + public + reports + shares.
 *
 * Keep this in sync with 20260627150000_feature5_acl_visibility.sql and
 * 20260701140934_breakglass_admin_access.sql: text comments reference the SQL.
 */

import { canViewItem, type AclViewer } from "./acl";
import { canViewPage as resolveCanViewPage, type PageShareGrant, type PageVisibility } from "./pageShare";
import { hasActiveDemoGrant } from "./demoAdminGrants";
import type { BreakGlassTargetType } from "./adminAccess";

export interface VisibilityViewer {
  userId: string;
  isAdmin: boolean;
  departmentId: string | null;
  /** user_ids of the viewer's direct reports (M365 hierarchy, one level). */
  directReportIds: string[];
}

/** Admin power over one item is granted only when an active break-glass grant exists. */
function grantedAdmin(v: VisibilityViewer, type: BreakGlassTargetType, id: string | undefined): boolean {
  return v.isAdmin && !!id && hasActiveDemoGrant(v.userId, type, id);
}

const toAcl = (v: VisibilityViewer, isAdmin: boolean): AclViewer => ({
  userId: v.userId,
  isAdmin,
  directReportIds: v.directReportIds,
});

/** projects: owner / stakeholder + public + manager-of-report + granted-admin. */
export function canViewProjectRow(
  viewer: VisibilityViewer,
  project: { id?: string; owner_id: string; visibility: string },
  stakeholderUserIds: readonly string[] = [],
): boolean {
  return canViewItem(toAcl(viewer, grantedAdmin(viewer, "project", project.id)), {
    ownerId: project.owner_id,
    isPublic: project.visibility === "public",
    stakeholderIds: stakeholderUserIds,
  });
}

/** tasks: owner (user_id) + public + manager-of-owner + granted-admin. */
export function canViewTaskRow(
  viewer: VisibilityViewer,
  task: { id?: string; user_id: string; visibility?: string | null },
): boolean {
  return canViewItem(toAcl(viewer, grantedAdmin(viewer, "task", task.id)), {
    ownerId: task.user_id,
    isPublic: task.visibility === "public",
  });
}

/** pages: owner + per-person shares + public + department + manager-of-owner + granted-admin. */
export function canViewPageRow(
  viewer: VisibilityViewer,
  page: {
    id?: string;
    owner_id: string | null;
    visibility: string;
    department_id?: string | null;
    shares?: readonly PageShareGrant[];
  },
): boolean {
  // Manager-of-owner is a project/task-style rule; pages also honor it.
  if (page.owner_id && viewer.directReportIds.includes(page.owner_id)) return true;
  return resolveCanViewPage(
    { userId: viewer.userId, isAdmin: grantedAdmin(viewer, "page", page.id), departmentId: viewer.departmentId },
    {
      ownerId: page.owner_id,
      visibility: page.visibility as PageVisibility,
      departmentId: page.department_id ?? null,
      shares: page.shares,
    },
  );
}
