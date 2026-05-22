import type { ColorBy, TimelineEvent } from "@/types/timeline";

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