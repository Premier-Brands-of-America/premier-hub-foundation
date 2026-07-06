/**
 * Employee workload measurement — pure, deterministic, side-effect-free (mirrors
 * the discipline of `reportsMetrics.ts`). The whole model lives here so it is
 * trivially tunable and fully unit-testable.
 *
 * The unit is **Workload Points (WLP)**: each open item contributes
 * `priority weight × type multiplier`. There is no time-tracking in this app, so
 * points are the honest no-hours fallback (Monday "effort via formula",
 * ClickUp "sprint points"). Capacity is a per-person weekly WLP budget; the ratio
 * `points / capacity` (utilization) drives all coloring. See AUDIT/workload-spec.md.
 */
import type { ArtRequest, RequestPriority, RequestType } from "@/types/request";
import { daysUntil } from "@/lib/dueDate";
import { requestLead, byPriorityThenDue, type RequestPerson } from "@/lib/requestMeta";

// ---- Tunable model constants (the whole model lives here) ----

/** Base weight by priority — the dominant effort signal (drives the queue sort too). */
export const PRIORITY_WEIGHT: Record<RequestPriority, number> = {
  urgent: 3,
  high: 2,
  medium: 1.5,
  low: 1,
};

/** Light secondary nudge: a full brief is materially more work than an easy request. */
export const TYPE_MULT: Record<RequestType, number> = {
  full_brief: 1.5,
  easy: 1,
};

/** ≈ a full week of medium-weight work (~6-7 medium items, or ~3 urgent full-briefs). */
export const DEFAULT_WEEKLY_CAPACITY_WLP = 10;

/** Utilization band thresholds (tunable next to the weights). */
export const BANDS = { healthy: 0.5, near: 0.85, over: 1.0 } as const;

/** The open/active statuses — done work is not load. Mirrors `demoRequestsStore` OPEN. */
export const OPEN_STATUSES = new Set<string>([
  "submitted",
  "in_review",
  "assigned",
  "in_progress",
  "waiting_on_info",
  "internal_review",
  "sent_for_approval",
]);

/** The bucket key for requests with no owner (kept in sync with `requestLead`). */
export const UNASSIGNED_KEY = "__unassigned__";

export type Band = "under" | "healthy" | "near" | "over" | "unassigned";
export type WindowKey = "this_week" | "next_week" | "all_open";

/** Points contributed by a single item = priority weight × type multiplier. */
export function itemPoints(r: Pick<ArtRequest, "priority" | "request_type">): number {
  return PRIORITY_WEIGHT[r.priority] * TYPE_MULT[r.request_type];
}

/** Is this request open/active (i.e. real load)? */
export function isOpen(r: ArtRequest): boolean {
  return OPEN_STATUSES.has(r.status);
}

/**
 * ISO-week (Mon 00:00 → next Mon 00:00) bounds for the window, computed in local
 * time from `now`. `this_week` = the week containing now; `next_week` = the
 * following week. `all_open` returns the current-week bounds (unused by callers,
 * kept total for testability).
 */
export function weekBounds(win: WindowKey, now: Date = new Date()): { start: Date; end: Date } {
  // Start of today (local midnight).
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // ISO weekday: Mon=0 … Sun=6.
  const isoDow = (startOfToday.getDay() + 6) % 7;
  const monday = new Date(startOfToday);
  monday.setDate(startOfToday.getDate() - isoDow);
  const offsetWeeks = win === "next_week" ? 1 : 0;
  const start = new Date(monday);
  start.setDate(monday.getDate() + offsetWeeks * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

/**
 * Is this open request in the given due-date window? (spec §1.4)
 *  - `all_open`: always true (every open item).
 *  - `this_week`: due before end-of-this-week — which INCLUDES overdue items
 *    (due < start) since they are still on the plate. Undated items (no due date)
 *    are counted as this-week load (they're open and owned).
 *  - `next_week`: due within the following ISO week (undated excluded).
 */
export function inWindow(r: ArtRequest, win: WindowKey, now: Date = new Date()): boolean {
  if (win === "all_open") return true;
  const t = r.due_date ? Date.parse(r.due_date) : null;
  const { start, end } = weekBounds(win, now);
  if (win === "this_week") {
    if (t === null || Number.isNaN(t)) return true; // undated → this-week load
    return t < end.getTime(); // includes overdue (t < start)
  }
  // next_week
  return t !== null && !Number.isNaN(t) && t >= start.getTime() && t < end.getTime();
}

/**
 * Is a request overdue relative to `now` (whole-day: due date strictly before
 * today)? Uses `daysUntil` — the same UTC calendar-day math the rest of the app
 * uses (DueDateBadge/dueLabel) — so a date-only "YYYY-MM-DD" due date never reads
 * as overdue from a timezone offset (the bug: UTC-midnight parse vs local midnight).
 */
export function isOverdue(r: ArtRequest, now: Date = new Date()): boolean {
  if (!r.due_date) return false;
  return daysUntil(r.due_date, now) < 0;
}

export interface PersonLoad {
  person: RequestPerson;
  /** The person's in-window items, sorted highest-priority-then-soonest-due. */
  items: ArtRequest[];
  /** Σ itemPoints — the honest headline number. */
  points: number;
  /** Raw item count (secondary stat). */
  count: number;
  /** Number of overdue items in the set. */
  overdue: number;
  /** Resolved weekly capacity for this person. */
  capacity: number;
  /** points / capacity. */
  util: number;
  band: Band;
  /** Points from items with no due date (for visual de-emphasis). */
  undatedPoints: number;
}

export interface TeamLoad {
  /** Sorted per caller (default here: util desc, unassigned always last). */
  people: PersonLoad[];
  totalPoints: number;
  totalCapacity: number;
  /** totalPoints / totalCapacity. */
  teamUtil: number;
  /** People whose band === "over". */
  overCount: number;
  /** Points sitting in the Unassigned bucket. */
  unassignedPoints: number;
}

/** Map a utilization ratio to a band. Unassigned is a fixed neutral band. */
export function bandFor(util: number, isUnassigned: boolean): Band {
  if (isUnassigned) return "unassigned";
  if (util >= BANDS.over) return "over";
  if (util >= BANDS.near) return "near";
  if (util >= BANDS.healthy) return "healthy";
  return "under";
}

/**
 * The one entry point the view calls: group open+in-window requests by
 * `requestLead`, sum points, resolve capacity, band each person, and aggregate a
 * team summary. Deterministic given (requests, win, capacities, now).
 *
 * @param capacities per-person capacity override map, keyed by RequestPerson.key.
 */
export function buildTeamLoad(
  requests: ArtRequest[],
  win: WindowKey,
  capacities?: Map<string, number>,
  now: Date = new Date(),
): TeamLoad {
  const byKey = new Map<string, { person: RequestPerson; items: ArtRequest[] }>();

  for (const r of requests) {
    if (!isOpen(r)) continue;
    if (!inWindow(r, win, now)) continue;
    const person = requestLead(r);
    const bucket = byKey.get(person.key) ?? { person, items: [] };
    bucket.items.push(r);
    byKey.set(person.key, bucket);
  }

  const people: PersonLoad[] = [];
  let totalPoints = 0;
  let totalCapacity = 0;
  let overCount = 0;
  let unassignedPoints = 0;

  for (const { person, items } of byKey.values()) {
    items.sort(byPriorityThenDue);
    const isUnassigned = person.key === UNASSIGNED_KEY;
    const points = round1(items.reduce((s, r) => s + itemPoints(r), 0));
    const undatedPoints = round1(
      items.filter((r) => !r.due_date).reduce((s, r) => s + itemPoints(r), 0),
    );
    const overdue = items.filter((r) => isOverdue(r, now)).length;
    const capacity = capacities?.get(person.key) ?? DEFAULT_WEEKLY_CAPACITY_WLP;
    const util = capacity > 0 ? points / capacity : 0;
    const band = bandFor(util, isUnassigned);

    people.push({ person, items, points, count: items.length, overdue, capacity, util, band, undatedPoints });

    // Team totals: exclude the unassigned bucket from capacity/over math (no person
    // to overload), but surface its points separately as a management signal.
    if (isUnassigned) {
      unassignedPoints = points;
    } else {
      totalPoints += points;
      totalCapacity += capacity;
      if (band === "over") overCount += 1;
    }
  }

  people.sort(comparePeople("util"));

  return {
    people,
    totalPoints: round1(totalPoints),
    totalCapacity,
    teamUtil: totalCapacity > 0 ? totalPoints / totalCapacity : 0,
    overCount,
    unassignedPoints,
  };
}

export type SortKey = "util" | "points" | "name" | "overdue";

/**
 * Comparator over PersonLoad. The Unassigned bucket always sorts last regardless
 * of key so it reads as the residual/management row.
 */
export function comparePeople(sort: SortKey): (a: PersonLoad, b: PersonLoad) => number {
  return (a, b) => {
    const au = a.person.key === UNASSIGNED_KEY ? 1 : 0;
    const bu = b.person.key === UNASSIGNED_KEY ? 1 : 0;
    if (au !== bu) return au - bu; // unassigned last
    switch (sort) {
      case "points":
        return b.points - a.points || a.person.name.localeCompare(b.person.name);
      case "name":
        return a.person.name.localeCompare(b.person.name);
      case "overdue":
        return b.overdue - a.overdue || b.util - a.util;
      case "util":
      default:
        return b.util - a.util || b.points - a.points;
    }
  };
}

/** Round to one decimal (avoids 3.0000000004 drift from float sums). */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
