// Per-user Workload view prefs (window + sort). Mirrors the reportPrefs pattern:
// persisted to localStorage in preview, keyed by user id. Capacity overrides
// belong here too (Phase 4) but v1 uses the DEFAULT_WEEKLY_CAPACITY_WLP constant.
import type { SortKey, WindowKey } from "@/lib/workloadMetrics";

export interface WorkloadPrefs {
  window: WindowKey;
  sort: SortKey;
  showUnassigned: boolean;
}

export const DEFAULT_WORKLOAD_PREFS: WorkloadPrefs = {
  window: "this_week",
  sort: "util",
  showUnassigned: true,
};

const WINDOWS: WindowKey[] = ["this_week", "next_week", "all_open"];
const SORTS: SortKey[] = ["util", "points", "name", "overdue"];

const keyFor = (userId: string) => `phv1:workload-prefs:${userId}`;

export function getWorkloadPrefs(userId: string | null | undefined): WorkloadPrefs {
  if (!userId) return DEFAULT_WORKLOAD_PREFS;
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return DEFAULT_WORKLOAD_PREFS;
    const parsed = JSON.parse(raw) as Partial<WorkloadPrefs>;
    return {
      window: WINDOWS.includes(parsed.window as WindowKey) ? (parsed.window as WindowKey) : DEFAULT_WORKLOAD_PREFS.window,
      sort: SORTS.includes(parsed.sort as SortKey) ? (parsed.sort as SortKey) : DEFAULT_WORKLOAD_PREFS.sort,
      showUnassigned: typeof parsed.showUnassigned === "boolean" ? parsed.showUnassigned : true,
    };
  } catch {
    return DEFAULT_WORKLOAD_PREFS;
  }
}

export function setWorkloadPrefs(userId: string | null | undefined, prefs: WorkloadPrefs): void {
  if (!userId) return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(prefs));
  } catch {
    /* noop */
  }
}
