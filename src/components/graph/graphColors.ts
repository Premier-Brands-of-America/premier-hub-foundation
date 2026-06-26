import type { NodeType, RelationType } from "@/types/graph";

export const NODE_COLOR_VAR: Record<NodeType, string> = {
  project: "--entity-project",
  task: "--entity-task",
  request: "--entity-request",
  page: "--entity-page",
  user: "--entity-person",
  department: "--entity-department",
};

function cssVar(name: string, fallback: string): string {
  const root = typeof document !== "undefined" ? document.documentElement : null;
  if (!root) return fallback;
  const v = getComputedStyle(root).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : fallback;
}

export function getNodeColor(type: NodeType): string {
  return cssVar(NODE_COLOR_VAR[type], "hsl(220, 12%, 50%)");
}

/** Resolved theme foreground — for canvas labels (canvas can't read CSS vars). */
export function getForegroundColor(): string {
  return cssVar("--foreground", "hsl(220, 15%, 20%)");
}

/** Map a free-text entity status onto a design-system status token. */
const STATUS_COLOR_VAR: Record<string, string> = {
  todo: "--status-todo",
  open: "--status-todo",
  backlog: "--status-todo",
  active: "--status-in-progress",
  in_progress: "--status-in-progress",
  "in progress": "--status-in-progress",
  in_review: "--status-info",
  review: "--status-info",
  blocked: "--status-blocked",
  on_hold: "--status-blocked",
  done: "--status-done",
  completed: "--status-done",
  closed: "--status-done",
};

/** Border tint for a node, by status. Returns null when status is unknown. */
export function getStatusColor(status?: string | null): string | null {
  if (!status) return null;
  const key = status.toLowerCase().trim();
  const v = STATUS_COLOR_VAR[key];
  return v ? cssVar(v, "hsl(220, 9%, 50%)") : null;
}

/** Area-proportional node radius (graph-space), matching react-force-graph's sqrt(val)*relSize. */
export function nodeRadius(degree: number, nodeSize: number): number {
  return Math.sqrt(degree + 1) * nodeSize;
}

export const RELATION_STYLES: Record<RelationType, { dash?: number[]; weight: number }> = {
  owns: { weight: 2 },
  stakeholder: { weight: 1.5 },
  assigned_to: { weight: 1.5 },
  belongs_to: { weight: 1.5 },
  relates_to: { weight: 1 },
  blocks: { weight: 2, dash: [4, 2] },
  duplicate_of: { weight: 1, dash: [2, 2] },
  parent_of: { weight: 1.5 },
  mentions: { weight: 1, dash: [2, 3] },
  linked_from: { weight: 1, dash: [2, 3] },
};