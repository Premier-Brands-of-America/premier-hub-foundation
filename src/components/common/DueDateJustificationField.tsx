/**
 * Structured due-date justification — required when a due date is set.
 * Captures reason (short text), type (Meeting/Launch/Deadline/Other), and an
 * optional linked event. Shared across Projects, Tasks, and Art Requests.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DUE_REASON_TYPES,
  type DueJustification,
  type DueReasonType,
} from "@/lib/dueDate";

export function DueDateJustificationField({
  value,
  onChange,
  required,
}: {
  value?: Partial<DueJustification> | null;
  onChange: (next: DueJustification) => void;
  required?: boolean;
}) {
  const v: Partial<DueJustification> = value ?? {};
  const set = (patch: Partial<DueJustification>) =>
    onChange({
      reason: v.reason ?? "",
      type: (v.type as DueReasonType) ?? "Deadline",
      linkedEvent: v.linkedEvent ?? null,
      ...patch,
    });

  const missing = required && (!v.reason || !v.reason.trim());

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Why this due date?{" "}
          {required && <span className="text-destructive">*</span>}
        </Label>
        {missing && (
          <span className="text-xs text-destructive">Reason required</span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Reason</Label>
          <Input
            value={v.reason ?? ""}
            placeholder="e.g. Client review meeting"
            onChange={(e) => set({ reason: e.target.value })}
            aria-invalid={missing || undefined}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Type</Label>
          <Select
            value={(v.type as string) ?? "Deadline"}
            onValueChange={(val) => set({ type: val as DueReasonType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DUE_REASON_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          Linked event (optional)
        </Label>
        <Input
          type="date"
          value={v.linkedEvent ?? ""}
          onChange={(e) => set({ linkedEvent: e.target.value })}
        />
      </div>
    </div>
  );
}

/** Read-only display of a justification, shown next to a due date. */
export function DueJustificationDisplay({
  value,
}: {
  value?: Partial<DueJustification> | null;
}) {
  if (!value || !value.reason) return null;
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
      <span className="font-medium">{value.type}: </span>
      <span className="text-foreground/80">{value.reason}</span>
      {value.linkedEvent && (
        <span className="ml-1 text-muted-foreground">
          ({new Date(value.linkedEvent).toLocaleDateString()})
        </span>
      )}
    </div>
  );
}
