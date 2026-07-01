// Preview/demo persistence for break-glass admin-access grants (no live DB).
// Mirrors the production RPCs: creating a grant appends a demo audit entry and
// pushes an owner notification; the active-grant check gates the demo ACL so
// preview matches production (no passive admin-sees-all — a grant unlocks one
// item). Backed by localStorage.

import {
  type AdminAccessGrant,
  type BreakGlassTargetType,
  resolveActiveGrant,
  targetTypeMeta,
} from "./adminAccess";
import { demoAppendAudit } from "./demoAuditStore";
import { demoPushNotification } from "./demoNotificationsStore";
import { demoResolveTargetOwner } from "./aclDemo";
import { getPreviewViewer } from "./previewViewer";

const KEY = "phv2:demo-admin-grants";

function load(): AdminAccessGrant[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AdminAccessGrant[]) : [];
  } catch {
    return [];
  }
}

function save(list: AdminAccessGrant[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

export function demoListGrants(): AdminAccessGrant[] {
  return load();
}

/** The current admin's active grant for an item (preview), or null. */
export function demoActiveGrant(
  userId: string,
  type: BreakGlassTargetType,
  id: string,
): AdminAccessGrant | null {
  return resolveActiveGrant(
    load(),
    { isAdmin: true, userId, targetType: type, targetId: id },
    Date.now(),
  );
}

export function hasActiveDemoGrant(
  userId: string,
  type: BreakGlassTargetType,
  id: string,
): boolean {
  return demoActiveGrant(userId, type, id) !== null;
}

/** Request access: record the grant, append a demo audit entry, notify the owner. */
export function demoCreateGrant(
  type: BreakGlassTargetType,
  id: string,
  reason: string,
  minutes: number,
): AdminAccessGrant {
  const v = getPreviewViewer();
  const adminId = v?.userId ?? "demo-admin";
  const adminName = v?.email ?? "Un administrador";
  const now = Date.now();
  const clamped = Math.min(Math.max(minutes, 5), 1440);
  const expiresAt = new Date(now + clamped * 60_000);

  const grant: AdminAccessGrant = {
    id: "demo-grant-" + now,
    admin_id: adminId,
    target_type: type,
    target_id: id,
    reason: reason.trim(),
    created_at: new Date(now).toISOString(),
    expires_at: expiresAt.toISOString(),
    revoked_at: null,
  };
  save([grant, ...load()]);

  const meta = targetTypeMeta(type);

  demoAppendAudit({
    actor_id: adminId,
    actor_name: adminName,
    actor_email: v?.email ?? "",
    area: type,
    action_kind: "admin_access_granted",
    action: "Requested support access",
    entity_type: meta.label,
    entity_label: id.slice(0, 8),
    detail: reason.trim(),
  });

  const owner = demoResolveTargetOwner(type, id);
  if (owner.user_id !== adminId) {
    const hhmm = expiresAt.toTimeString().slice(0, 5); // HH:MM
    demoPushNotification({
      user_id: owner.user_id,
      type: "warning",
      title: `Un administrador accedió a tu ${meta.es} para soporte`,
      message: `${adminName}: ${reason.trim()} (acceso hasta ${hhmm}).`,
      link: meta.route(id),
    });
  }

  return grant;
}

/** Revoke a grant and append a demo audit entry. */
export function demoRevokeGrant(grantId: string): void {
  const list = load();
  const i = list.findIndex((g) => g.id === grantId);
  if (i < 0 || list[i].revoked_at) return;
  const g = list[i];
  list[i] = { ...g, revoked_at: new Date().toISOString() };
  save(list);

  const meta = targetTypeMeta(g.target_type);
  const v = getPreviewViewer();
  demoAppendAudit({
    actor_id: g.admin_id,
    actor_name: v?.email ?? "Un administrador",
    actor_email: v?.email ?? "",
    area: g.target_type,
    action_kind: "admin_access_revoked",
    action: "Revoked support access",
    entity_type: meta.label,
    entity_label: g.target_id.slice(0, 8),
  });
}
