import { useFeatureFlag } from "@/hooks/use-feature-flag";

interface FeatureGateProps {
  feature: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Renders children when the named feature flag is enabled.
 * Currently always passes through (placeholder); swap useFeatureFlag for the
 * live hook once feature flag administration UI ships.
 */
export function FeatureGate({ feature, fallback = null, children }: FeatureGateProps) {
  const enabled = useFeatureFlag(feature);
  if (!enabled) return <>{fallback}</>;
  return <>{children}</>;
}