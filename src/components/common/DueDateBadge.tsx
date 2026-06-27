/**
 * Due-date badge — prominent, color-coded by urgency (overdue=red, soon=amber,
 * normal=neutral). Shared across Projects, Tasks, and Art Requests.
 */
import { CalendarClock, AlertTriangle, CalendarCheck, CalendarX } from "lucide-react";
import { cn } from "@/lib/utils";
import { dueUrgency, dueLabel, type DueUrgency } from "@/lib/dueDate";

const TONE: Record<DueUrgency, string> = {
  overdue:
    "bg-destructive/15 text-destructive border-destructive/30",
  soon: "bg-warning/15 text-warning border-warning/30",
  normal: "bg-muted text-foreground/80 border-border",
  none: "bg-muted/50 text-muted-foreground border-border/60",
};

const ICON: Record<DueUrgency, typeof CalendarClock> = {
  overdue: CalendarX,
  soon: AlertTriangle,
  normal: CalendarClock,
  none: CalendarCheck,
};

export function DueDateBadge({
  due,
  className,
  size = "sm",
}: {
  due?: string | Date | null;
  className?: string;
  size?: "sm" | "md";
}) {
  const urgency = dueUrgency(due);
  const Icon = ICON[urgency];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        TONE[urgency],
        className,
      )}
      title={due ? new Date(due).toLocaleDateString() : "No due date"}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {dueLabel(due)}
    </span>
  );
}
