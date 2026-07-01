import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast } from "@/lib/error-toast";
import { useAdminAccessGrant, useInvalidateAdminAccessGrant } from "@/hooks/useAdminAccessGrant";
import { revokeAdminAccess } from "@/services/adminAccessService";
import { grantRemainingMs, type BreakGlassTargetType } from "@/lib/adminAccess";

interface ActiveAccessBannerProps {
  targetType: BreakGlassTargetType;
  targetId: string | undefined;
  onRevoked?: () => void;
}

function hhmm(iso: string): string {
  return new Date(iso).toTimeString().slice(0, 5);
}

/**
 * Slim amber banner shown while the admin holds an active break-glass grant for
 * the item. Ticks so it disappears when the grant expires, and offers revoke.
 */
export function ActiveAccessBanner({ targetType, targetId, onRevoked }: ActiveAccessBannerProps) {
  const { grant } = useAdminAccessGrant(targetType, targetId);
  const invalidate = useInvalidateAdminAccessGrant();
  const { toast } = useToast();
  const [, setTick] = useState(0);
  const [revoking, setRevoking] = useState(false);

  // Re-evaluate every 15s so the banner clears itself on expiry.
  useEffect(() => {
    if (!grant) return;
    const t = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, [grant]);

  if (!grant || grantRemainingMs(grant, Date.now()) <= 0) return null;

  const revoke = async () => {
    setRevoking(true);
    try {
      await revokeAdminAccess(grant.id);
      toast({ title: "Acceso de soporte revocado" });
      if (targetId) invalidate(targetType, targetId);
      onRevoked?.();
    } catch (err) {
      showErrorToast(err, "No se pudo revocar el acceso");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 text-sm"
      style={{
        backgroundColor: "hsl(var(--status-warning) / 0.12)",
        borderBottom: "1px solid hsl(var(--status-warning) / 0.35)",
        color: "hsl(var(--status-warning))",
      }}
      role="status"
    >
      <ShieldCheck className="h-4 w-4 shrink-0" />
      <span className="font-medium">Acceso de soporte activo · vence {hhmm(grant.expires_at)}</span>
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto h-7 text-current hover:bg-foreground/10"
        onClick={revoke}
        disabled={revoking}
      >
        {revoking ? "Revocando…" : "Revocar"}
      </Button>
    </div>
  );
}
