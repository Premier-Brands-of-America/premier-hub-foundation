import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Placeholder feature flag hook. Returns true while infrastructure is wired up.
 * Once UI is ready to gate features, replace with the live query below.
 */
export function useFeatureFlag(_featureKey: string): boolean {
  return true;
}

export function useFeatureFlagLive(featureKey: string) {
  const { user, profile } = useAuth();
  return useQuery({
    queryKey: ["feature_flag", featureKey, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("feature_flags")
        .select("entity_type, enabled")
        .eq("feature_key", featureKey);
      if (!data?.length) return false;
      const userFlag = data.find((f) => f.entity_type === "user");
      if (userFlag) return userFlag.enabled;
      const deptFlag = data.find((f) => f.entity_type === "department");
      if (deptFlag) return deptFlag.enabled;
      const globalFlag = data.find((f) => f.entity_type === "global");
      return globalFlag?.enabled ?? false;
    },
    enabled: !!user || !!profile,
  });
}