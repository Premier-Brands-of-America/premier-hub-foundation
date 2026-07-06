/**
 * Break-glass / just-in-time admin access — pure, DB-agnostic logic.
 *
 * Mirrors the migration 20260701140934_breakglass_admin_access.sql: an admin
 * gets NO passive access to others' private content; they must hold an active,
 * time-boxed, audited grant for a specific item. These helpers resolve "is there
 * an active grant?" and map a target type to its owner-facing label / route, so
 * the UI, the preview demo store, and the tests all agree on the semantics.
 */

export type BreakGlassTargetType = "project" | "task" | "page";

export interface AdminAccessGrant {
  id: string;
  admin_id: string;
  target_type: BreakGlassTargetType;
  target_id: string;
  reason: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

/** Duration options (minutes) offered in the request dialog; 60 is the default. */
export const ACCESS_DURATIONS = [30, 60, 120, 240] as const;
export const DEFAULT_ACCESS_MINUTES = 60;

/** Active = not revoked and not yet expired. */
export function isGrantActive(grant: AdminAccessGrant, nowMs: number): boolean {
  if (grant.revoked_at) return false;
  return new Date(grant.expires_at).getTime() > nowMs;
}

/** Milliseconds until the grant expires (0 once expired or revoked). */
export function grantRemainingMs(grant: AdminAccessGrant, nowMs: number): number {
  if (!isGrantActive(grant, nowMs)) return 0;
  return Math.max(0, new Date(grant.expires_at).getTime() - nowMs);
}

export interface GrantResolverInput {
  isAdmin: boolean;
  userId: string;
  targetType: BreakGlassTargetType;
  targetId: string;
}

/**
 * The current user's active grant for a specific item, or null. Returns null for
 * non-admins (defence-in-depth — RLS is the real gate) and, when several grants
 * match, returns the one that expires latest.
 */
export function resolveActiveGrant(
  grants: readonly AdminAccessGrant[],
  input: GrantResolverInput,
  nowMs: number,
): AdminAccessGrant | null {
  if (!input.isAdmin) return null;
  const matches = grants.filter(
    (g) =>
      g.admin_id === input.userId &&
      g.target_type === input.targetType &&
      g.target_id === input.targetId &&
      isGrantActive(g, nowMs),
  );
  if (matches.length === 0) return null;
  return matches.reduce((a, b) =>
    new Date(b.expires_at).getTime() > new Date(a.expires_at).getTime() ? b : a,
  );
}

interface TargetMeta {
  /** Label used in UI copy and owner-facing notifications. */
  label: string;
  /** App route for the item — matches the notification link format `/<type>s/<id>`. */
  route: (id: string) => string;
}

const TARGET_META: Record<BreakGlassTargetType, TargetMeta> = {
  project: { label: "Project", route: (id) => `/projects/${id}` },
  task: { label: "Task", route: (id) => `/tasks/${id}` },
  page: { label: "Page", route: (id) => `/pages/${id}` },
};

export function targetTypeMeta(type: BreakGlassTargetType): TargetMeta {
  return TARGET_META[type];
}
