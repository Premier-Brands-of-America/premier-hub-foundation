import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import type { FeatureKey } from "@/lib/featureKeys";

interface FeatureGateProps {
  feature: FeatureKey;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Renders children only when the feature flag is enabled.
 * IMPORTANT: never render disabled UI — hide entirely (no grayed states).
 */
export function FeatureGate({ feature, fallback = null, children }: FeatureGateProps) {
  const enabled = useFeatureFlag(feature);
  if (!enabled) return <>{fallback}</>;
  return <>{children}</>;
}