import { CARD_REGISTRY } from "./card-registry";
import {
  GRID_COLUMNS,
  MAX_H,
  MAX_W,
  MIN_H,
  MIN_W,
  type CardType,
  type DashboardWidget,
} from "./types";

export function newWidgetId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `w-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function clampW(w: number): number {
  return Math.max(MIN_W, Math.min(MAX_W, Math.round(w)));
}

export function clampH(h: number): number {
  return Math.max(MIN_H, Math.min(MAX_H, Math.round(h)));
}

/** Build a fresh widget for a card type using its registry defaults. */
export function createWidget(type: CardType): DashboardWidget {
  const def = CARD_REGISTRY[type];
  return {
    id: newWidgetId(),
    type,
    config: { ...def.defaultConfig },
    x: 0,
    y: 0,
    w: clampW(def.defaultSize.w),
    h: clampH(def.defaultSize.h),
  };
}

/**
 * Recompute each widget's x/y by packing them left-to-right into a
 * 12-column lane model, in array order. Order is the source of truth for
 * position (drag/keyboard reorder mutate the array); x/y mirror the flow so
 * the persisted shape stays honest.
 */
export function normalizeLayout(widgets: DashboardWidget[]): DashboardWidget[] {
  let col = 0;
  let row = 0;
  return widgets.map((widget) => {
    const w = clampW(widget.w);
    const h = clampH(widget.h);
    if (col + w > GRID_COLUMNS) {
      col = 0;
      row += 1;
    }
    const placed = { ...widget, w, h, x: col, y: row };
    col += w;
    if (col >= GRID_COLUMNS) {
      col = 0;
      row += 1;
    }
    return placed;
  });
}

/** Move the widget at `from` to `to` (array reorder), then renormalize. */
export function moveWidget(
  widgets: DashboardWidget[],
  from: number,
  to: number,
): DashboardWidget[] {
  if (from === to || from < 0 || to < 0 || from >= widgets.length || to >= widgets.length) {
    return widgets;
  }
  const next = widgets.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return normalizeLayout(next);
}
