/**
 * Break-glass admin-access service.
 *
 * Production → the SECURITY DEFINER RPCs request_admin_access / revoke_admin_access
 * (which audit + notify the owner) and a scoped query for the current active grant.
 * Preview → the localStorage demo store (which mirrors those side effects).
 */
import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import type { AdminAccessGrant, BreakGlassTargetType } from "@/lib/adminAccess";
import {
  demoActiveGrant,
  demoCreateGrant,
  demoRevokeGrant,
} from "@/lib/demoAdminGrants";

const IS_PREVIEW = isPreviewEnvironment();

// admin_access_grants + the RPCs aren't in the generated Supabase types; use a
// loose view of the client (mirrors the pattern in useAuditLog).
type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

export async function requestAdminAccess(
  targetType: BreakGlassTargetType,
  targetId: string,
  reason: string,
  minutes = 60,
): Promise<AdminAccessGrant> {
  if (IS_PREVIEW) return demoCreateGrant(targetType, targetId, reason, minutes);

  const { data, error } = await (supabase as unknown as RpcClient).rpc("request_admin_access", {
    _target_type: targetType,
    _target_id: targetId,
    _reason: reason,
    _minutes: minutes,
  });
  if (error) throw error;
  return data as AdminAccessGrant;
}

export async function revokeAdminAccess(grantId: string): Promise<void> {
  if (IS_PREVIEW) {
    demoRevokeGrant(grantId);
    return;
  }
  const { error } = await (supabase as unknown as RpcClient).rpc("revoke_admin_access", {
    _grant_id: grantId,
  });
  if (error) throw error;
}

/** The current admin's active grant for a specific item, or null. */
export async function fetchActiveGrant(
  userId: string,
  targetType: BreakGlassTargetType,
  targetId: string,
): Promise<AdminAccessGrant | null> {
  if (IS_PREVIEW) return demoActiveGrant(userId, targetType, targetId);

  const { data, error } = await (supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          eq: (c: string, v: string) => {
            eq: (c: string, v: string) => {
              is: (c: string, v: null) => {
                gt: (c: string, v: string) => {
                  order: (c: string, o: { ascending: boolean }) => {
                    limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }>;
                  };
                };
              };
            };
          };
        };
      };
    };
  })
    .from("admin_access_grants")
    .select("id, admin_id, target_type, target_id, reason, created_at, expires_at, revoked_at")
    .eq("admin_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return ((data ?? []) as AdminAccessGrant[])[0] ?? null;
}
