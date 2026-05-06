import { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ALL_FEATURE_KEYS, type FeatureKey } from "@/lib/featureKeys";

type FlagMap = Partial<Record<FeatureKey, boolean>>;

interface FeatureFlagsContextValue {
  flags: FlagMap;
  loading: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flags: {},
  loading: true,
});

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const departmentId = profile?.department_id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["feature_flags", userId],
    enabled: !!userId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<FlagMap> => {
      const { data, error } = await supabase.rpc("resolve_features", {
        p_keys: ALL_FEATURE_KEYS as unknown as string[],
      });
      if (error) throw error;
      const map: FlagMap = {};
      (data ?? []).forEach((row: { feature_key: string; enabled: boolean }) => {
        map[row.feature_key as FeatureKey] = row.enabled;
      });
      return map;
    },
  });

  // Realtime invalidation for relevant flag rows
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`feature_flags:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feature_flags" },
        (payload) => {
          const row = (payload.new ?? payload.old) as {
            entity_type?: string;
            entity_id?: string | null;
          } | null;
          if (!row) return;
          const matches =
            (row.entity_type === "global" && row.entity_id === null) ||
            (row.entity_type === "user" && row.entity_id === userId) ||
            (row.entity_type === "department" && row.entity_id === departmentId);
          if (matches) {
            queryClient.invalidateQueries({ queryKey: ["feature_flags", userId] });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, departmentId, queryClient]);

  const value = useMemo<FeatureFlagsContextValue>(
    () => ({
      flags: data ?? {},
      loading: authLoading || (!!userId && isLoading),
    }),
    [data, isLoading, authLoading, userId]
  );

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlagsContext() {
  return useContext(FeatureFlagsContext);
}