import { useFeatureFlagsContext } from "@/providers/FeatureFlagsProvider";
import type { FeatureKey } from "@/lib/featureKeys";

/**
 * Returns whether a feature is enabled for the current user.
 * Fail-closed: returns false while loading or if not yet resolved.
 */
export function useFeatureFlag(key: FeatureKey): boolean {
  const { flags, loading } = useFeatureFlagsContext();
  if (loading) return false;
  return flags[key] === true;
}