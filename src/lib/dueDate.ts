/**
 * Due-date urgency + structured justification — shared across Projects, Tasks,
 * and Art Requests. Pure logic; UI lives in `components/common/DueDateBadge`.
 */

export type DueUrgency = "overdue" | "soon" | "normal" | "none";

/** Reason category for a due date (brief §1.2 "Due date justification"). */
export type DueReasonType = "Meeting" | "Launch" | "Deadline" | "Other";

export const DUE_REASON_TYPES: DueReasonType[] = [
  "Meeting",
  "Launch",
  "Deadline",
  "Other",
];

export interface DueJustification {
  reason: string; // short text, e.g. "Client review meeting"
  type: DueReasonType;
  linkedEvent?: string | null; // optional date or reference
}

const MS_PER_DAY = 86_400_000;

/**
 * Whole-day difference (due - now) in UTC calendar days. Uses UTC components on
 * both sides so the result is deterministic regardless of runtime timezone.
 * Date-only strings (YYYY-MM-DD) parse as UTC midnight, which is what we want.
 */
export function daysUntil(due: string | Date, now: Date = new Date()): number {
  const d = typeof due === "string" ? new Date(due) : due;
  const a = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const b = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((a - b) / MS_PER_DAY);
}

/**
 * Classify due-date urgency.
 * @param soonWithinDays how many days ahead still counts as "due soon" (amber)
 */
export function dueUrgency(
  due: string | Date | null | undefined,
  now: Date = new Date(),
  soonWithinDays = 3,
): DueUrgency {
  if (!due) return "none";
  const days = daysUntil(due, now);
  if (days < 0) return "overdue";
  if (days <= soonWithinDays) return "soon";
  return "normal";
}

/** Token/Tailwind hints for each urgency (consumed by DueDateBadge). */
export const URGENCY_STYLE: Record<
  DueUrgency,
  { label: string; tone: "destructive" | "warning" | "neutral" | "muted" }
> = {
  overdue: { label: "Overdue", tone: "destructive" },
  soon: { label: "Due soon", tone: "warning" },
  normal: { label: "On track", tone: "neutral" },
  none: { label: "No due date", tone: "muted" },
};

/** Short human label: "Overdue 2d", "Due today", "Due in 5d", "—". */
export function dueLabel(
  due: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  if (!due) return "—";
  const days = daysUntil(due, now);
  if (days < 0) return `Overdue ${Math.abs(days)}d`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

/** A justification is complete when a due date is set (brief: required-when-set). */
export function isJustificationComplete(
  due: string | Date | null | undefined,
  j: Partial<DueJustification> | null | undefined,
): boolean {
  if (!due) return true; // not required when there's no due date
  return Boolean(j && j.reason && j.reason.trim().length > 0 && j.type);
}
