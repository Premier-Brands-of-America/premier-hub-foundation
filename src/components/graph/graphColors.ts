import type { EdgeKind, NodeType, RelationType } from "@/types/graph";

export const NODE_COLOR_VAR: Record<NodeType, string> = {
  project: "--entity-project",
  task: "--entity-task",
  request: "--entity-request",
  page: "--entity-page",
  user: "--entity-person",
  department: "--entity-department",
  concept: "--entity-concept",
};

function cssVar(name: string, fallback: string): string {
  const root = typeof document !== "undefined" ? document.documentElement : null;
  if (!root) return fallback;
  const v = getComputedStyle(root).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : fallback;
}

/** Returns a raw HSL string (no `hsl()` wrapper) for alpha blending. */
function cssVarRaw(name: string, fallback: string): string {
  const root = typeof document !== "undefined" ? document.documentElement : null;
  if (!root) return fallback;
  const v = getComputedStyle(root).getPropertyValue(name).trim();
  return v || fallback;
}

/** Build an `hsla(…, alpha)` string from a CSS variable that holds `H S% L%`. */
export function withAlpha(cssVarName: string, alpha: number, fallbackHsl = "220, 12%, 50%"): string {
  const raw = cssVarRaw(cssVarName, fallbackHsl);
  return `hsla(${raw}, ${alpha})`;
}

export function getNodeColor(type: NodeType): string {
  return cssVar(NODE_COLOR_VAR[type], "hsl(220, 12%, 50%)");
}

/** Resolved theme foreground — for canvas labels (canvas can't read CSS vars). */
export function getForegroundColor(): string {
  return cssVar("--foreground", "hsl(220, 15%, 20%)");
}

/** Primary color for selection/hover rings. */
export function getPrimaryColor(): string {
  return cssVar("--primary", "hsl(347, 84%, 42%)");
}

/** Card surface — used as a subtle, translucent label backplate (not an
 *  opaque box) so text reads cleanly over nodes/edges in either theme. */
export function getCardColor(): string {
  return cssVar("--card", "hsl(0 0% 100%)");
}

/** Selection ring — electric-violet (inspector/selected accent). */
export function getSelectionColor(): string {
  return cssVar("--selection", "hsl(246 92% 72%)");
}

/** Hover ring — crimson-ink active accent (legacy token name). */
export function getHoverColor(): string {
  return cssVar("--signal-cyan-300", "hsl(349 85% 62%)");
}

/** The graph canvas backdrop — surface-void (carbon in dark mode). */
export function getVoidColor(): string {
  return cssVar("--surface-void", "hsl(24 10% 5%)");
}

/** Raw `H S% L%` triplet of any CSS var — for building canvas gradients and
 *  per-stop alpha (`hsl(<raw> / a)`), which the canvas resolves at runtime. */
export function rawVar(name: string, fallback: string): string {
  return cssVarRaw(name, fallback);
}

/** Raw triplet for a node's entity hue (for glow + edge gradients). */
export function getNodeColorRaw(type: NodeType): string {
  return cssVarRaw(NODE_COLOR_VAR[type], "228 12% 64%");
}

/**
 * Edge color based on highlight state. Kept calm and low-key so the warm-dark
 * canvas reads quietly: active edges use the warm-neutral --muted-foreground at
 * 0.45 opacity; dimmed use --border at 0.12. Fallbacks are warm-neutral grays
 * (never a pink hue) in case a CSS var fails to resolve on the canvas.
 */
export function getEdgeColor(active: boolean): string {
  if (active) {
    return withAlpha("--muted-foreground", 0.45, "28, 6%, 60%");
  }
  return withAlpha("--border", 0.12, "24, 6%, 18%");
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
  reports_to: { weight: 1.5 },
  member_of: { weight: 1 },
};

/**
 * Edge-kind styling (graphify provenance). When an edge carries an `edgeKind`
 * (the memory graph), the dash pattern is driven by provenance rather than the
 * relation type: EXTRACTED solid, INFERRED dashed, AMBIGUOUS dotted. MANUAL and
 * STRUCTURAL fall through to the relation-type style (as the graph always drew).
 */
export const EDGE_KIND_DASH: Record<EdgeKind, number[] | undefined> = {
  MANUAL: undefined,
  STRUCTURAL: undefined,
  EXTRACTED: undefined,   // solid
  INFERRED: [5, 3],       // dashed
  AMBIGUOUS: [1, 3],      // dotted
};

/** Resolve the dash pattern for an edge, preferring provenance over relation. */
export function edgeDash(type: RelationType, edgeKind?: EdgeKind): number[] | undefined {
  if (edgeKind === "INFERRED" || edgeKind === "AMBIGUOUS") return EDGE_KIND_DASH[edgeKind];
  if (edgeKind === "EXTRACTED") return undefined;
  return RELATION_STYLES[type]?.dash;
}