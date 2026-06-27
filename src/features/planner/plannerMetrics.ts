/**
 * Pure analytics over a board — drives the Planner-style dashboard charts.
 * Unit-tested in plannerMetrics.test.ts.
 */
import type { Board } from "./types";
import { dueUrgency } from "@/lib/dueDate";

export interface CountDatum {
  name: string;
  value: number;
}

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

function tally<T extends string>(items: T[]): Map<T, number> {
  const m = new Map<T, number>();
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1);
  return m;
}

export function statusBreakdown(board: Board): CountDatum[] {
  const t = tally(board.cards.map((c) => c.status));
  return ["not_started", "in_progress", "completed"].map((s) => ({
    name: STATUS_LABEL[s],
    value: t.get(s as never) ?? 0,
  }));
}

export function byBucket(board: Board): CountDatum[] {
  const names = new Map(board.buckets.map((b) => [b.id, b.name]));
  const t = tally(board.cards.map((c) => c.bucketId));
  return board.buckets
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((b) => ({ name: names.get(b.id) ?? "—", value: t.get(b.id) ?? 0 }));
}

export function byPriority(board: Board): CountDatum[] {
  const t = tally(board.cards.map((c) => c.priority));
  return ["urgent", "high", "medium", "low"].map((p) => ({
    name: p[0].toUpperCase() + p.slice(1),
    value: t.get(p as never) ?? 0,
  }));
}

export function byAssignee(board: Board): CountDatum[] {
  const t = tally(board.cards.map((c) => c.assigneeName ?? "Unassigned"));
  return [...t.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function dueHealth(board: Board, now: Date = new Date()): CountDatum[] {
  const t = tally(board.cards.map((c) => dueUrgency(c.dueDate, now)));
  return [
    { name: "Overdue", value: t.get("overdue") ?? 0 },
    { name: "Due soon", value: t.get("soon") ?? 0 },
    { name: "On track", value: t.get("normal") ?? 0 },
    { name: "No date", value: t.get("none") ?? 0 },
  ];
}
