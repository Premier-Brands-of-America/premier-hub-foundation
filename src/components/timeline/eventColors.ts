import type { ColorBy, TimelineEntityType, TimelineEvent } from "@/types/timeline";

/** One swatch in the generated toolbar legend. */
export interface LegendEntry {
  label: string;
  /** CSS var name (without hsl()) — same token the bars/pills paint with. */
  token: string;
}

const ENTITY_LABELS: Record<TimelineEntityType, string> = {
  task: "Task",
  project: "Project",
  request: "Request",
};

/**
 * The legend for the current "Color by" mode. Kept in lockstep with
 * getEventColorVar so a swatch always equals the color a bar would paint —
 * type mode uses the entity tokens (the same ones the filter chips show).
 */
export function legendFor(colorBy: ColorBy): LegendEntry[] {
  if (colorBy === "type") {
    return (["task", "project", "request"] as TimelineEntityType[]).map((t) => ({
      label: ENTITY_LABELS[t],
      token: `--entity-${t}`,
    }));
  }
  if (colorBy === "priority") {
    return [
      { label: "Low", token: "--priority-low" },
      { label: "Medium", token: "--priority-medium" },
      { label: "High", token: "--priority-high" },
      { label: "Urgent", token: "--priority-urgent" },
    ];
  }
  return [
    { label: "To do", token: "--status-todo" },
    { label: "In progress", token: "--status-in-progress" },
    { label: "Blocked", token: "--status-blocked" },
    { label: "Done", token: "--status-done" },
  ];
}

export function getEventColorVar(event: TimelineEvent, colorBy: ColorBy): string {
  if (colorBy === "type") return `--entity-${event.entity_type}`;
  if (colorBy === "priority") {
    const p = (event.color_hint ?? "medium").toLowerCase();
    if (["low", "medium", "high", "urgent"].includes(p)) return `--priority-${p}`;
    return `--priority-medium`;
  }
  // status
  const s = (event.status ?? "").toLowerCase();
  if (s.includes("done") || s === "complete" || s === "completed") return "--status-done";
  if (s.includes("block")) return "--status-blocked";
  if (s.includes("progress") || s === "active" || s === "in_review") return "--status-in-progress";
  return "--status-todo";
}