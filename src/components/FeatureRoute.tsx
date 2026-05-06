import { Navigate } from "react-router-dom";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useFeatureFlagsContext } from "@/providers/FeatureFlagsProvider";
import { toast } from "@/hooks/use-toast";
import type { FeatureKey } from "@/lib/featureKeys";
import { useEffect } from "react";

interface FeatureRouteProps {
  feature: FeatureKey;
  children: React.ReactNode;
}

export function FeatureRoute({ feature, children }: FeatureRouteProps) {
  const enabled = useFeatureFlag(feature);
  const { loading } = useFeatureFlagsContext();

  useEffect(() => {
    if (!loading && !enabled) {
      toast({ title: "Feature not available", variant: "destructive" });
    }
  }, [loading, enabled]);

  if (loading) return null;
  if (!enabled) return <Navigate to="/" replace />;
  return <>{children}</>;
}