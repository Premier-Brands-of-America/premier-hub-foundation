// Per-user Reports dashboard layout — which predefined charts are shown.
// In preview this persists to localStorage keyed by user id. In production the
// same shape belongs under profiles.preferences->'report_charts' (a user-prefs
// column already exists; see DECISIONS.md) — wiring that is deploy-gated.

export type ReportChartId =
  | "status"
  | "by_department"
  | "workload"
  | "due_health"
  | "throughput"
  | "priority";

export const ALL_REPORT_CHARTS: ReportChartId[] = [
  "status",
  "by_department",
  "workload",
  "due_health",
  "throughput",
  "priority",
];

export const REPORT_CHART_META: Record<ReportChartId, { title: string; description: string }> = {
  status: { title: "Status breakdown", description: "Requests by current status" },
  by_department: { title: "By department", description: "Open requests per department" },
  workload: { title: "Manager / assignee workload", description: "Open items per person" },
  due_health: { title: "Due-date health", description: "Overdue, due soon, on track" },
  throughput: { title: "Throughput over time", description: "Requests submitted per week" },
  priority: { title: "Priority mix", description: "Requests by priority level" },
};

/** Sensible default set shown to a user who hasn't customized their dashboard. */
export const DEFAULT_REPORT_CHARTS: ReportChartId[] = [
  "status",
  "by_department",
  "workload",
  "due_health",
  "throughput",
  "priority",
];

const keyFor = (userId: string) => `phv2:report-charts:${userId}`;

export function getReportCharts(userId: string | null | undefined): ReportChartId[] {
  if (!userId) return DEFAULT_REPORT_CHARTS;
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return DEFAULT_REPORT_CHARTS;
    const parsed = JSON.parse(raw) as ReportChartId[];
    const valid = parsed.filter((id) => ALL_REPORT_CHARTS.includes(id));
    return valid.length ? valid : DEFAULT_REPORT_CHARTS;
  } catch {
    return DEFAULT_REPORT_CHARTS;
  }
}

export function setReportCharts(userId: string | null | undefined, charts: ReportChartId[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(charts));
  } catch {
    /* noop */
  }
}
