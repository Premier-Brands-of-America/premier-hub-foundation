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
import type { Task } from "@/types/tasks";
import type { ProjectWithMeta } from "@/types/projects";
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

/**
 * Weights for the non-request kinds of open work, kept identical to the Network
 * graph's own person-workload (`GRAPH_WORKLOAD_WEIGHT` in graphColors.ts) so the
 * report and the graph tell the same story: owning a project ≫ stakeholder ≫ task.
 * (Owner's request, July 2026.)
 */
export const PROJECT_OWNER_POINTS = 3;
export const PROJECT_STAKEHOLDER_POINTS = 1.5;
export const TASK_POINTS = 1;

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

/**
 * Window test on a bare due-date string (project/task) — the same §1.4 rule as
 * `inWindow`, factored so tasks/projects (which carry only a date, not a full
 * ArtRequest) share identical semantics: `this_week` includes overdue + undated;
 * `next_week` is the following ISO week (undated & overdue excluded); `all_open`
 * is always true.
 */
export function inWindowDate(due: string | null | undefined, win: WindowKey, now: Date = new Date()): boolean {
  if (win === "all_open") return true;
  const t = due ? Date.parse(due) : null;
  const { start, end } = weekBounds(win, now);
  if (win === "this_week") {
    if (t === null || Number.isNaN(t)) return true; // undated → this-week load
    return t < end.getTime(); // includes overdue (t < start)
  }
  // next_week
  return t !== null && !Number.isNaN(t) && t >= start.getTime() && t < end.getTime();
}

/** Overdue test on a bare due-date string (whole-day, UTC calendar math). */
export function isOverdueDate(due: string | null | undefined, now: Date = new Date()): boolean {
  if (!due) return false;
  return daysUntil(due, now) < 0;
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

/** The minimal per-person shape the comparator reads — satisfied by both
 *  {@link PersonLoad} (requests-only) and {@link PersonTotalLoad} (all work). */
export interface ComparablePerson {
  person: { key: string; name: string };
  points: number;
  util: number;
  overdue: number;
}

/**
 * Comparator over any person-load row (requests-only or total). The Unassigned
 * bucket always sorts last regardless of key so it reads as the residual/
 * management row.
 */
export function comparePeople<T extends ComparablePerson>(sort: SortKey): (a: T, b: T) => number {
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

// ─────────────────────────────────────────────────────────────────────────────
// Total open load — requests + projects + tasks (the primary report model)
//
// buildTeamLoad (above) is requests-only and is still used by the graph demo and
// its tests. buildTotalLoad generalizes it: every open contribution — an art
// request you lead, a project you own or are a stakeholder on, a task assigned to
// you — is scored on ONE person, with weights that match the Network graph
// (owner 3 ≫ stakeholder 1.5 ≫ task 1; requests keep priority × type). This is
// why someone with tasks/projects but no requests (e.g. the signed-in admin) now
// appears, consistent with the graph.
// ─────────────────────────────────────────────────────────────────────────────

/** The provenance of a single load contribution. */
export type LoadKind = "request" | "project" | "task";

/** One weighted contribution to a person's total load (request / project / task). */
export interface LoadItem {
  id: string;
  title: string;
  /** Points this item contributes (already weighted by kind/priority). */
  points: number;
  kind: LoadKind;
  /** Human role for this contribution ("Owner" | "Stakeholder" | "Assignee" | "Lead" | "Assigned manager"). */
  role?: string;
  due_date?: string | null;
  /** Requests only — drives the priority chip in the drill-in. */
  priority?: RequestPriority;
  /** Free-text status (request status, or "active" for projects/tasks). */
  status?: string;
  overdue: boolean;
}

export interface PersonTotalLoad {
  person: RequestPerson;
  /** The person's in-window contributions, heaviest-first. */
  items: LoadItem[];
  /** Σ points — the headline number. */
  points: number;
  /** Raw contribution count. */
  count: number;
  /** Number of overdue contributions. */
  overdue: number;
  capacity: number;
  util: number;
  band: Band;
  /** Points from contributions with no due date (for visual de-emphasis). */
  undatedPoints: number;
}

export interface TeamTotalLoad {
  people: PersonTotalLoad[];
  totalPoints: number;
  totalCapacity: number;
  teamUtil: number;
  overCount: number;
  unassignedPoints: number;
}

/** The open-work inputs, mirroring the three services (requests / tasks / projects). */
export interface TotalLoadInput {
  requests: ArtRequest[];
  tasks: Task[];
  projects: ProjectWithMeta[];
}

/** Resolve a user id to a `{key,name,title}` person, merging with request-lead
 *  names by lowercasing the display name (so a request lead "Jaclyn" and a task
 *  owner whose profile name is "Jaclyn" land on the SAME row). Falls back to a
 *  short id-based label when the directory can't resolve the id — never blank. */
function personForUser(userId: string, directory: Map<string, string>, title: string): RequestPerson {
  const name = directory.get(userId);
  if (name && name.trim()) {
    return { key: name.trim().toLowerCase(), name: name.trim(), title };
  }
  // Unknown id → stable, non-merging bucket keyed by the id, with a short label.
  const short = userId.length > 8 ? `User ${userId.slice(0, 6)}` : `User ${userId}`;
  return { key: `uid:${userId}`, name: short, title };
}

/**
 * Build the TOTAL open-load model across requests + projects + tasks.
 *
 * Attribution (all bucketed onto ONE person key so sources merge):
 *  - Request → `requestLead` (name key), points via `itemPoints` (priority × type).
 *  - Project (status "active") → owner_id resolves to a person (3 pts, "Owner");
 *    each stakeholder whose user_id ≠ owner_id resolves to a person (1.5, "Stakeholder").
 *  - Task (status "active") → user_id resolves to a person (1 pt, "Assignee").
 *
 * Windowing (§1.4) applies to every kind by its due date; project due =
 * `desired_due_date ?? updated_due_date`, task due = `due_date`, request due =
 * `due_date`. Undated open items count as this-week load and are flagged undated.
 * Done/complete/archived never count.
 *
 * Deterministic given (input, directory, win, capacities, now).
 *
 * @param directory user_id → display name (project stakeholders, current user, prod profiles).
 * @param capacities per-person capacity override map, keyed by RequestPerson.key.
 */
export function buildTotalLoad(
  input: TotalLoadInput,
  directory: Map<string, string>,
  win: WindowKey,
  capacities?: Map<string, number>,
  now: Date = new Date(),
): TeamTotalLoad {
  const byKey = new Map<string, { person: RequestPerson; items: LoadItem[] }>();

  const push = (person: RequestPerson, item: LoadItem) => {
    const bucket = byKey.get(person.key) ?? { person, items: [] };
    bucket.items.push(item);
    byKey.set(person.key, bucket);
  };

  // ── Requests (open + in-window), attributed to the request lead ──
  for (const r of input.requests) {
    if (!isOpen(r)) continue;
    if (!inWindow(r, win, now)) continue;
    const person = requestLead(r);
    push(person, {
      id: r.id,
      title: r.title,
      points: itemPoints(r),
      kind: "request",
      role: person.title,
      due_date: r.due_date,
      priority: r.priority,
      status: r.status,
      overdue: isOverdue(r, now),
    });
  }

  // ── Projects (active), owner + stakeholders ──
  for (const p of input.projects) {
    if (p.status !== "active") continue;
    const due = p.desired_due_date ?? p.updated_due_date ?? null;
    if (!inWindowDate(due, win, now)) continue;
    const overdue = isOverdueDate(due, now);

    // Owner (3 pts).
    const owner = personForUser(p.owner_id, directory, "Owner");
    push(owner, {
      id: `project:${p.id}:owner`,
      title: p.title,
      points: PROJECT_OWNER_POINTS,
      kind: "project",
      role: "Owner",
      due_date: due,
      status: p.status,
      overdue,
    });

    // Stakeholders that aren't the owner (1.5 pts each). Dedupe by user_id so a
    // person listed twice on a project isn't double-counted.
    const seen = new Set<string>([p.owner_id]);
    for (const s of p.stakeholders ?? []) {
      if (!s.user_id || seen.has(s.user_id)) continue;
      seen.add(s.user_id);
      // Prefer the stakeholder's own full_name (already carried on the enriched
      // row) so we merge by name even if this id isn't in the directory yet.
      const nameHint = s.full_name && s.full_name.trim() ? s.full_name.trim() : null;
      const person: RequestPerson = nameHint
        ? { key: nameHint.toLowerCase(), name: nameHint, title: "Stakeholder" }
        : personForUser(s.user_id, directory, "Stakeholder");
      push(person, {
        id: `project:${p.id}:sh:${s.user_id}`,
        title: p.title,
        points: PROJECT_STAKEHOLDER_POINTS,
        kind: "project",
        role: "Stakeholder",
        due_date: due,
        status: p.status,
        overdue,
      });
    }
  }

  // ── Tasks (active), attributed to the owner (user_id) ──
  for (const t of input.tasks) {
    if (t.status !== "active") continue;
    if (!inWindowDate(t.due_date, win, now)) continue;
    const person = personForUser(t.user_id, directory, "Assignee");
    push(person, {
      id: `task:${t.id}`,
      title: t.title,
      points: TASK_POINTS,
      kind: "task",
      role: "Assignee",
      due_date: t.due_date,
      status: t.status,
      overdue: isOverdueDate(t.due_date, now),
    });
  }

  const people: PersonTotalLoad[] = [];
  let totalPoints = 0;
  let totalCapacity = 0;
  let overCount = 0;
  let unassignedPoints = 0;

  for (const { person, items } of byKey.values()) {
    // Heaviest contribution first; ties by soonest due date (undated last).
    items.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const ad = a.due_date ? Date.parse(a.due_date) : Infinity;
      const bd = b.due_date ? Date.parse(b.due_date) : Infinity;
      return ad - bd;
    });
    const isUnassigned = person.key === UNASSIGNED_KEY;
    const points = round1(items.reduce((s, it) => s + it.points, 0));
    const undatedPoints = round1(
      items.filter((it) => !it.due_date).reduce((s, it) => s + it.points, 0),
    );
    const overdue = items.filter((it) => it.overdue).length;
    const capacity = capacities?.get(person.key) ?? DEFAULT_WEEKLY_CAPACITY_WLP;
    const util = capacity > 0 ? points / capacity : 0;
    const band = bandFor(util, isUnassigned);

    people.push({ person, items, points, count: items.length, overdue, capacity, util, band, undatedPoints });

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

/** Round to one decimal (avoids 3.0000000004 drift from float sums). */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
