/**
 * Editable dashboard — shared types.
 *
 * Each dashboard widget is a *saved view config* (a filtered/sorted/grouped
 * query over EXISTING tables), never duplicated data. The grid stays generic:
 * adding a card type = registering one entry in the card registry.
 */

export type CardType =
  | "my-open-tasks"
  | "project-rollup"
  | "recent-pages"
  | "calendar-week"
  | "art-request-queue"
  | "mini-graph";

/** The "saved view" carried by a widget — filter / sort / group + scope. */
export interface WidgetConfig {
  /** Source table the view reads from (informational; cards own their query). */
  source?: "tasks" | "projects" | "pages" | "requests" | "calendar_events";
  /** Equality filters applied to the source, e.g. { status: "active" }. */
  filter?: Record<string, string | number | boolean | null>;
  /** Single-column sort. */
  sort?: { field: string; dir: "asc" | "desc" };
  /** Group-by column (used by rollup cards). */
  group?: string;
  /** Max rows the card renders. */
  limit?: number;
  /** Card-specific scope, e.g. project-rollup "owned" | "assigned". */
  scope?: string;
  /** Optional title override (defaults to the registry title). */
  title?: string;
}

/** A placed widget. `x`/`y` track flow position; `w`/`h` are 12-col grid spans. */
export interface DashboardWidget {
  id: string;
  type: CardType;
  config: WidgetConfig;
  x: number;
  y: number;
  /** Column span, 1..12. */
  w: number;
  /** Row span, 1..n. */
  h: number;
}

/** Persisted row shape — NOT in the generated Supabase types yet (cast at the
 *  `.from("dashboard_layouts")` boundary only). The lead regenerates types at P4. */
export interface DashboardLayoutRow {
  user_id: string;
  layout: DashboardWidget[];
  updated_at: string;
}

export const GRID_COLUMNS = 12;
export const MIN_W = 2;
export const MAX_W = 12;
export const MIN_H = 1;
export const MAX_H = 3;
