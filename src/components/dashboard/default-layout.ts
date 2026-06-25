import { createWidget, normalizeLayout } from "./layout-utils";
import type { CardType, DashboardWidget } from "./types";

/** Card types present in a brand-new dashboard, in display order. */
const DEFAULT_CARD_ORDER: CardType[] = [
  "my-open-tasks",
  "project-rollup",
  "art-request-queue",
  "recent-pages",
  "calendar-week",
  "mini-graph",
];

/** Build the default per-user layout (used on first load + "Reset"). */
export function defaultLayout(): DashboardWidget[] {
  return normalizeLayout(DEFAULT_CARD_ORDER.map((type) => createWidget(type)));
}
