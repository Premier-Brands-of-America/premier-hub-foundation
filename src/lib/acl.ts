/**
 * ACL / row-level visibility resolver (Feature 5).
 *
 * Pure, DB-agnostic logic that mirrors the RLS policy written in the migration,
 * so the preview demo path filters items the same way the database would.
 *
 * Visibility model:
 *  - A viewer sees an item if they are its owner / project-lead / assignee /
 *    stakeholder / member, OR the item is public.
 *  - Managers additionally see items "belonging to" their direct reports — i.e.
 *    items where a direct report holds any of those same relations.
 *  - Admins see everything.
 *  - New items default to private (owner/team only); public is opt-in via
 *    `isPublic`.
 *
 * The service layer adapts raw rows (and join tables) into `AclItem` so this
 * stays independent of exact column names.
 */

export interface AclViewer {
  userId: string;
  isAdmin?: boolean;
  /** user_ids of people who report directly to the viewer (one level). */
  directReportIds?: readonly string[];
}

export interface AclItem {
  ownerId?: string | null;
  /** project-lead (or item lead). */
  leadId?: string | null;
  assigneeId?: string | null;
  stakeholderIds?: readonly string[];
  memberIds?: readonly string[];
  isPublic?: boolean;
}

export type AclReason =
  | "admin"
  | "public"
  | "owner"
  | "lead"
  | "assignee"
  | "stakeholder"
  | "member"
  | "manager-of-report"
  | "none";

/** The set of relations that grant a *specific user* direct access to an item. */
function directRelation(userId: string, item: AclItem): AclReason | null {
  if (item.ownerId && item.ownerId === userId) return "owner";
  if (item.leadId && item.leadId === userId) return "lead";
  if (item.assigneeId && item.assigneeId === userId) return "assignee";
  if (item.stakeholderIds?.includes(userId)) return "stakeholder";
  if (item.memberIds?.includes(userId)) return "member";
  return null;
}

export interface AclResult {
  visible: boolean;
  reason: AclReason;
}

export function resolveItemVisibility(viewer: AclViewer, item: AclItem): AclResult {
  if (viewer.isAdmin) return { visible: true, reason: "admin" };

  const own = directRelation(viewer.userId, item);
  if (own) return { visible: true, reason: own };

  if (item.isPublic) return { visible: true, reason: "public" };

  // Manager rule: any direct report holding a direct relation to the item.
  const reports = viewer.directReportIds;
  if (reports && reports.length > 0) {
    for (const reportId of reports) {
      if (directRelation(reportId, item)) {
        return { visible: true, reason: "manager-of-report" };
      }
    }
  }

  return { visible: false, reason: "none" };
}

export function canViewItem(viewer: AclViewer, item: AclItem): boolean {
  return resolveItemVisibility(viewer, item).visible;
}

export function filterVisibleItems<T extends AclItem>(viewer: AclViewer, items: readonly T[]): T[] {
  return items.filter((it) => canViewItem(viewer, it));
}
