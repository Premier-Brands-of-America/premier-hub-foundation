import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchActiveGrant } from "@/services/adminAccessService";
import type { BreakGlassTargetType } from "@/lib/adminAccess";

/**
 * The current user's active break-glass grant for a specific item (or null).
 * Only queries for admins; refetches periodically so an expiry (or a grant made
 * elsewhere) is reflected. The banner does its own second-by-second countdown
 * from the returned expires_at.
 */
export function useAdminAccessGrant(targetType: BreakGlassTargetType, targetId: string | undefined) {
  const { user, profile } = useAuth();
  const userId = user?.id ?? profile?.user_id ?? "";
  const isAdmin = profile?.is_admin ?? false;
  const enabled = !!userId && isAdmin && !!targetId;

  const query = useQuery({
    queryKey: ["admin-access-grant", targetType, targetId, userId],
    queryFn: () => fetchActiveGrant(userId, targetType, targetId!),
    enabled,
    refetchInterval: 60_000,
  });

  return {
    grant: query.data ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
    isAdmin,
  };
}

/** Invalidate the active-grant query for an item after request/revoke. */
export function useInvalidateAdminAccessGrant() {
  const qc = useQueryClient();
  return (targetType: BreakGlassTargetType, targetId: string) =>
    qc.invalidateQueries({ queryKey: ["admin-access-grant", targetType, targetId] });
}
