/**
 * Client-side board filters + bucket→proof-state mapping. Pure, controller-free:
 * the board controller (demo or Supabase) is never touched — filtering is a
 * presentation concern that lives entirely in local component state.
 */
import type { PlannerCard, CardPriority } from "./types";
import { cardProofState, type ProofState } from "@/components/pressroom";

/** Active filter selection. Empty set / null = "no constraint on this facet". */
export interface BoardFilters {
  assignees: string[];
  customers: string[];
  priorities: CardPriority[];
  /** Due-window facet; null = any due date (or none). */
  due: DueFilter | null;
}

export type DueFilter = "overdue" | "week" | "none";

export const EMPTY_FILTERS: BoardFilters = {
  assignees: [],
  customers: [],
  priorities: [],
  due: null,
};

export const DUE_FILTER_LABEL: Record<DueFilter, string> = {
  overdue: "Overdue",
  week: "Due this week",
  none: "No due date",
};

export const PRIORITY_LABEL: Record<CardPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

/** True when NO facet constrains anything (used to hide the active-chip row). */
export function isEmptyFilters(f: BoardFilters): boolean {
  return (
    f.assignees.length === 0 &&
    f.customers.length === 0 &&
    f.priorities.length === 0 &&
    f.due === null
  );
}

function matchesDue(card: PlannerCard, due: DueFilter, now: number): boolean {
  // A completed card is off the due radar entirely (mirrors the card's own rule).
  if (card.status === "completed") return due === "none" ? !card.dueDate : false;
  if (due === "none") return !card.dueDate;
  if (!card.dueDate) return false;
  const t = new Date(card.dueDate).getTime();
  if (due === "overdue") return t < now;
  // "week" = due within the next 7 days (and not already overdue).
  return t >= now && t <= now + 7 * 86_400_000;
}

/**
 * Predicate: does a card pass ALL active facets? Facets are AND-combined across
 * types and OR-combined within a type (standard multi-select filter grammar).
 */
export function matchesFilters(
  card: PlannerCard,
  f: BoardFilters,
  now: number = Date.now(),
): boolean {
  if (f.assignees.length && !f.assignees.includes(card.assigneeName ?? "")) return false;
  if (f.customers.length && !f.customers.includes(card.customer ?? "")) return false;
  if (f.priorities.length && !f.priorities.includes(card.priority)) return false;
  if (f.due && !matchesDue(card, f.due, now)) return false;
  return true;
}

/** Name-match a bucket label onto the proof taxonomy. */
function proofStateFromName(name: string): ProofState | null {
  const n = name.trim().toLowerCase();
  if (/(^|\b)(intake|backlog|to ?do|new|inbox|queue)\b/.test(n)) return "intake";
  if (/(in ?progress|doing|active|design|wip)/.test(n)) return "in_progress";
  if (/(proof|review|internal)/.test(n)) return "proofing";
  if (/(approv|sign[- ]?off|client)/.test(n)) return "with_approver";
  if (/(done|complete|shipped|closed)/.test(n)) return "done";
  return null;
}

/**
 * Map a user-named bucket onto the pressroom proof taxonomy so column headers
 * can borrow the chip color language. Real boards use arbitrary bucket names,
 * so we first try name-matching common lane names; if that misses, we fall back
 * to the dominant card status via the kit's `cardProofState` (a lane full of
 * completed cards tints as Done even if it's called "Approved"). A truly empty
 * or unclassifiable bucket returns null and keeps a neutral dot.
 */
export function bucketProofState(name: string, cards: PlannerCard[] = []): ProofState | null {
  const byName = proofStateFromName(name);
  if (byName) return byName;
  if (!cards.length) return null;
  // Pick the most common card-derived state so the header reflects the lane.
  const tally = new Map<ProofState, number>();
  for (const c of cards) {
    const s = cardProofState(c.status);
    tally.set(s, (tally.get(s) ?? 0) + 1);
  }
  let best: ProofState | null = null;
  let bestN = 0;
  for (const [state, n] of tally) {
    if (n > bestN) {
      best = state;
      bestN = n;
    }
  }
  return best;
}

/** Columns whose in-flight work benefits from a WIP hint. */
export function isWipLane(state: ProofState | null): boolean {
  return state === "in_progress";
}
