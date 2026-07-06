/**
 * Pressroom proof-state taxonomy — the ONE status vocabulary the whole hub
 * speaks. The app has three legacy status models that never reconciled
 * (request status, task active/complete, planner card status); this maps all
 * of them onto a single pressroom lifecycle so a work item reads the same in
 * List, Board, Calendar, Home, and the Queue.
 *
 *   Intake → In Progress → Proofing → With Approver → Done
 *   (+ Waiting and Blocked as off-track modifiers)
 *
 * Colors are semantic tokens only (never crimson — the brand accent is
 * reserved for "you are here / do this", never for data or status).
 */

export type ProofState =
  | "intake"
  | "in_progress"
  | "proofing"
  | "with_approver"
  | "waiting"
  | "blocked"
  | "done"
  | "archived";

interface ProofMeta {
  label: string;
  /** CSS var name (without hsl()) for the dot + tint. */
  token: string;
  /** Ordinal for sorting a board / grouping. */
  order: number;
}

export const PROOF_META: Record<ProofState, ProofMeta> = {
  intake:        { label: "Intake",        token: "--status-neutral",     order: 0 },
  in_progress:   { label: "In Progress",   token: "--status-in-progress", order: 1 },
  proofing:      { label: "Proofing",      token: "--entity-request",     order: 2 },
  with_approver: { label: "With Approver", token: "--entity-project",     order: 3 },
  waiting:       { label: "Waiting",       token: "--status-warning",     order: 2 },
  blocked:       { label: "Blocked",       token: "--status-danger",      order: 2 },
  done:          { label: "Done",          token: "--status-done",        order: 4 },
  archived:      { label: "Archived",      token: "--muted-foreground",   order: 5 },
};

/** Ordered list of the columns a board shows (excludes modifier states). */
export const PROOF_COLUMNS: ProofState[] = [
  "intake",
  "in_progress",
  "proofing",
  "with_approver",
  "done",
];

/** Map an art-request status onto the pressroom lifecycle. */
export function requestProofState(status: string): ProofState {
  switch (status) {
    case "submitted":
    case "assigned":
      return "intake";
    case "in_progress":
      return "in_progress";
    case "in_review":
    case "internal_review":
      return "proofing";
    case "sent_for_approval":
      return "with_approver";
    case "waiting_on_info":
      return "waiting";
    case "complete":
      return "done";
    case "archived":
      return "archived";
    default:
      return "intake";
  }
}

/** Map a task status onto the pressroom lifecycle. */
export function taskProofState(status: string, percent?: number | null): ProofState {
  if (status === "complete") return "done";
  if ((percent ?? 0) > 0) return "in_progress";
  return "intake";
}

/** Map a planner card status onto the pressroom lifecycle. */
export function cardProofState(status: string): ProofState {
  if (status === "completed") return "done";
  if (status === "in_progress") return "in_progress";
  return "intake";
}

/** A done/archived item should never carry an alarming due chip. */
export function isTerminal(state: ProofState): boolean {
  return state === "done" || state === "archived";
}
