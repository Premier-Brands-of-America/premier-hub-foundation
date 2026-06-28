// Pure analytics for the Reports dashboard — app-wide metrics across art
// requests, planner tasks, and projects. Mirrors the planner's CountDatum shape
// so the chart layer can reuse the same recharts patterns. Deterministic and
// side-effect free (the data hook supplies the inputs).
import type { ArtRequest, RequestPriority } from "@/types/request";
import type { Board, PlannerCard } from "@/features/planner/types";
import { dueUrgency } from "@/lib/dueDate";
import { requestLead } from "@/lib/requestMeta";
import type { DepartmentRow } from "@/hooks/useDepartments";

export interface CountDatum {
  name: string;
  value: number;
}

/** Normalized, kind-agnostic item the metrics operate over. */
export interface ReportItem {
  kind: "request" | "task" | "project";
  status: "Not started" | "In progress" | "In review" | "Completed";
  priority: RequestPriority;
  dueDate: string | null;
  owner: string;
  department: string | null;
  createdAt: string | null;
  open: boolean;
}

const REQUEST_STATUS_MAP: Record<string, ReportItem["status"]> = {
  submitted: "Not started",
  assigned: "Not started",
  in_progress: "In progress",
  waiting_on_info: "In progress",
  in_review: "In review",
  internal_review: "In review",
  sent_for_approval: "In review",
  complete: "Completed",
  archived: "Completed",
};

const CARD_STATUS_MAP: Record<string, ReportItem["status"]> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

/** Build the normalized item set from the preview data sources. */
export function buildReportItems(
  requests: ArtRequest[],
  board: Board | null,
  departments: DepartmentRow[],
): ReportItem[] {
  const deptName = new Map(departments.map((d) => [d.id, d.name]));

  const fromRequests: ReportItem[] = requests.map((r) => {
    const status = REQUEST_STATUS_MAP[r.status] ?? "Not started";
    return {
      kind: "request",
      status,
      priority: r.priority,
      dueDate: r.due_date,
      owner: requestLead(r).name,
      department: deptName.get(r.department_id) ?? r.department_id,
      createdAt: r.created_at,
      open: status !== "Completed",
    };
  });

  const fromCards: ReportItem[] = (board?.cards ?? []).map((c: PlannerCard) => {
    const status = CARD_STATUS_MAP[c.status] ?? "Not started";
    return {
      kind: c.kind === "project" ? "project" : c.kind === "request" ? "request" : "task",
      status,
      priority: c.priority,
      dueDate: c.dueDate ?? null,
      owner: c.assigneeName ?? "Unassigned",
      department: null,
      createdAt: c.startDate ?? null,
      open: status !== "Completed",
    };
  });

  return [...fromRequests, ...fromCards];
}

function tally(names: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const n of names) m.set(n, (m.get(n) ?? 0) + 1);
  return m;
}

const STATUS_ORDER: ReportItem["status"][] = ["Not started", "In progress", "In review", "Completed"];

export function statusBreakdown(items: ReportItem[]): CountDatum[] {
  const t = tally(items.map((i) => i.status));
  return STATUS_ORDER.map((s) => ({ name: s, value: t.get(s) ?? 0 }));
}

/** Open requests per department (requests carry department; cards don't). */
export function byDepartment(items: ReportItem[]): CountDatum[] {
  const t = tally(
    items.filter((i) => i.department && i.open).map((i) => i.department as string),
  );
  return [...t.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/** Open items per owner (manager / assignee). */
export function workload(items: ReportItem[]): CountDatum[] {
  const t = tally(items.filter((i) => i.open).map((i) => i.owner));
  return [...t.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export function dueHealth(items: ReportItem[], now: Date = new Date()): CountDatum[] {
  const t = tally(items.map((i) => dueUrgency(i.dueDate, now)));
  return [
    { name: "Overdue", value: t.get("overdue") ?? 0 },
    { name: "Due soon", value: t.get("soon") ?? 0 },
    { name: "On track", value: t.get("normal") ?? 0 },
    { name: "No date", value: t.get("none") ?? 0 },
  ];
}

export function priorityMix(items: ReportItem[]): CountDatum[] {
  const t = tally(items.map((i) => i.priority));
  return (["urgent", "high", "medium", "low"] as RequestPriority[]).map((p) => ({
    name: p[0].toUpperCase() + p.slice(1),
    value: t.get(p) ?? 0,
  }));
}

/** Items created per ISO week over the trailing `weeks` window (oldest→newest). */
export function throughput(items: ReportItem[], weeks = 6, now: Date = new Date()): CountDatum[] {
  const MS_WEEK = 7 * 86_400_000;
  // Anchor to the start of the current week bucket.
  const end = now.getTime();
  const buckets: CountDatum[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = end - (i + 1) * MS_WEEK;
    const stop = end - i * MS_WEEK;
    const count = items.filter((it) => {
      if (!it.createdAt) return false;
      const t = Date.parse(it.createdAt);
      return t > start && t <= stop;
    }).length;
    const weeksBack = i;
    const label = weeksBack === 0 ? "This wk" : `-${weeksBack}w`;
    buckets.push({ name: label, value: count });
  }
  return buckets;
}
