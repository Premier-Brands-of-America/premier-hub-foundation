/**
 * Small read helpers over an ArtRequest's loosely-typed `metadata` bag, shared by
 * the portal views (My Requests / Queue / Workload). Keeps the metadata-shape
 * knowledge in one place: customer/brand, the responsible person (assigned
 * manager → project lead → assignee), and priority ordering for sorts.
 */
import type { ArtRequest, RequestPriority } from "@/types/request";

function metaString(req: ArtRequest, key: string): string | null {
  const v = (req.metadata ?? {})[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Customer / brand the request is for, if recorded. */
export function requestCustomer(req: ArtRequest): string | null {
  return metaString(req, "customer");
}

export interface RequestPerson {
  /** Stable seed/key for grouping + the deterministic DiceBear portrait. */
  key: string;
  /** Display name. */
  name: string;
  /** Context line under the name (e.g. "Project lead"). */
  title: string;
}

/** Title-case a single token like "jaclyn" → "Jaclyn". */
function cap(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * The person responsible for a request. Prefers the human-readable manager/lead
 * recorded in metadata, then falls back to the assignee id, then "Unassigned".
 */
export function requestLead(req: ArtRequest): RequestPerson {
  const manager = metaString(req, "assigned_manager");
  const lead = metaString(req, "project_lead");
  const name = manager ?? lead;
  if (name) {
    return {
      key: name.toLowerCase(),
      name: cap(name),
      title: manager ? "Assigned manager" : "Project lead",
    };
  }
  if (req.assignee_id) {
    return { key: req.assignee_id, name: "Assigned", title: "Assignee" };
  }
  return { key: "__unassigned__", name: "Unassigned", title: "No owner yet" };
}

/** Numeric rank so requests sort urgent → low. */
export const PRIORITY_RANK: Record<RequestPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/** Sort comparator: highest priority first, then soonest due date. */
export function byPriorityThenDue(a: ArtRequest, b: ArtRequest): number {
  const p = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
  if (p !== 0) return p;
  const ad = a.due_date ? Date.parse(a.due_date) : Infinity;
  const bd = b.due_date ? Date.parse(b.due_date) : Infinity;
  return ad - bd;
}
