import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import { useAuth } from "@/hooks/useAuth";

/**
 * Gate for the memory knowledge graph: admin OR an active memory-access grant
 * (direct user / department / everyone). Admins short-circuit synchronously; for
 * non-admins in production we ask the RLS-safe can_view_memory RPC.
 *
 * In preview there is no grants table, so access mirrors the admin flag.
 */
export function useCanViewMemory(): { canView: boolean; isLoading: boolean } {
  const { profile, user, loading } = useAuth();
  const isAdmin = !!profile?.is_admin || profile?.role === "admin";
  const preview = isPreviewEnvironment();

  const { data, isLoading } = useQuery({
    queryKey: ["can-view-memory", user?.id],
    enabled: !preview && !isAdmin && !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("can_view_memory" as never, {
        _uid: user!.id,
      } as never);
      if (error) return false;
      return !!data;
    },
  });

  if (isAdmin) return { canView: true, isLoading: loading };
  if (preview) return { canView: isAdmin, isLoading: loading };
  return { canView: !!data, isLoading: loading || isLoading };
}
