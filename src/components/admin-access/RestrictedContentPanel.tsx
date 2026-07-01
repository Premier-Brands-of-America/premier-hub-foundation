import { useState } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequestAccessDialog } from "./RequestAccessDialog";
import { targetTypeMeta, type BreakGlassTargetType } from "@/lib/adminAccess";

interface RestrictedContentPanelProps {
  targetType: BreakGlassTargetType;
  targetId: string;
  /** Called after a grant is created so the caller can refetch the now-visible item. */
  onGranted?: () => void;
}

/**
 * Break-glass panel shown to an admin when a project / task / page comes back
 * forbidden from RLS. Instead of a plain 404, it explains that temporary support
 * access is logged and the owner is notified, and offers to request it.
 */
export function RestrictedContentPanel({ targetType, targetId, onGranted }: RestrictedContentPanelProps) {
  const [open, setOpen] = useState(false);
  const meta = targetTypeMeta(targetType);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card/50 p-8 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: "hsl(var(--status-warning) / 0.14)", color: "hsl(var(--status-warning))" }}
      >
        <Shield className="h-6 w-6" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-foreground">Contenido privado</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          No tienes acceso a este {meta.es}. Como administrador puedes solicitar acceso temporal para dar
          soporte. La acción queda <strong className="text-foreground">registrada</strong> en la bitácora de
          auditoría y se <strong className="text-foreground">notifica al propietario</strong>.
        </p>
      </div>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Shield className="h-4 w-4" />
        Acceder para soporte
      </Button>

      <RequestAccessDialog
        open={open}
        onOpenChange={setOpen}
        targetType={targetType}
        targetId={targetId}
        onGranted={onGranted}
      />
    </div>
  );
}
