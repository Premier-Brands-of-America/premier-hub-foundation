import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast } from "@/lib/error-toast";
import { requestAdminAccess } from "@/services/adminAccessService";
import {
  ACCESS_DURATIONS,
  DEFAULT_ACCESS_MINUTES,
  targetTypeMeta,
  type BreakGlassTargetType,
} from "@/lib/adminAccess";

interface RequestAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: BreakGlassTargetType;
  targetId: string;
  onGranted?: () => void;
}

/** Reason + duration dialog. On confirm, requests a time-boxed break-glass grant. */
export function RequestAccessDialog({ open, onOpenChange, targetType, targetId, onGranted }: RequestAccessDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [minutes, setMinutes] = useState(String(DEFAULT_ACCESS_MINUTES));
  const [submitting, setSubmitting] = useState(false);
  const meta = targetTypeMeta(targetType);

  const submit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await requestAdminAccess(targetType, targetId, reason.trim(), Number(minutes));
      toast({
        title: "Acceso de soporte concedido",
        description: `Tienes acceso temporal a este ${meta.es}. Se registró en la bitácora y se notificó al propietario.`,
      });
      setReason("");
      onOpenChange(false);
      onGranted?.();
    } catch (err) {
      showErrorToast(err, "No se pudo solicitar el acceso");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acceder para soporte</DialogTitle>
          <DialogDescription>
            Este acceso queda registrado en la bitácora de auditoría y se notifica al propietario del {meta.es}.
            Úsalo solo para tareas de soporte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ba-reason">Motivo</Label>
            <Textarea
              id="ba-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe por qué necesitas acceder…"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ba-duration">Duración</Label>
            <Select value={minutes} onValueChange={setMinutes}>
              <SelectTrigger id="ba-duration" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCESS_DURATIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} minutos
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!reason.trim() || submitting}>
            {submitting ? "Solicitando…" : "Conceder acceso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
