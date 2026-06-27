import { describe, it, expect } from "vitest";
import {
  statusBreakdown,
  byBucket,
  byPriority,
  byAssignee,
  dueHealth,
} from "./plannerMetrics";
import type { Board } from "./types";

const now = new Date("2026-06-27T12:00:00Z");

function card(p: Partial<Board["cards"][number]>): Board["cards"][number] {
  return {
    id: Math.random().toString(36).slice(2),
    bucketId: "b1",
    kind: "task",
    title: "t",
    status: "not_started",
    priority: "medium",
    checklist: [],
    attachments: [],
    comments: [],
    position: 0,
    ...p,
  };
}

const board: Board = {
  projectId: "p",
  projectTitle: "x",
  buckets: [
    { id: "b1", name: "To do", position: 0 },
    { id: "b2", name: "Doing", position: 1 },
  ],
  cards: [
    card({ bucketId: "b1", status: "not_started", priority: "high", assigneeName: "Jaclyn", dueDate: "2026-06-20" }),
    card({ bucketId: "b1", status: "in_progress", priority: "urgent", assigneeName: "Jaclyn", dueDate: "2026-06-28" }),
    card({ bucketId: "b2", status: "completed", priority: "low", assigneeName: "Dan", dueDate: "2026-08-01" }),
    card({ bucketId: "b2", status: "in_progress", priority: "medium" }),
  ],
};

describe("plannerMetrics", () => {
  it("status breakdown", () => {
    expect(statusBreakdown(board)).toEqual([
      { name: "Not started", value: 1 },
      { name: "In progress", value: 2 },
      { name: "Completed", value: 1 },
    ]);
  });
  it("by bucket (ordered)", () => {
    expect(byBucket(board)).toEqual([
      { name: "To do", value: 2 },
      { name: "Doing", value: 2 },
    ]);
  });
  it("by priority", () => {
    const p = Object.fromEntries(byPriority(board).map((d) => [d.name, d.value]));
    expect(p.Urgent).toBe(1);
    expect(p.High).toBe(1);
    expect(p.Medium).toBe(1);
    expect(p.Low).toBe(1);
  });
  it("by assignee (desc, incl. Unassigned)", () => {
    const a = byAssignee(board);
    expect(a[0]).toEqual({ name: "Jaclyn", value: 2 });
    expect(a.find((d) => d.name === "Unassigned")?.value).toBe(1);
  });
  it("due-date health", () => {
    expect(dueHealth(board, now)).toEqual([
      { name: "Overdue", value: 1 },
      { name: "Due soon", value: 1 },
      { name: "On track", value: 1 },
      { name: "No date", value: 1 },
    ]);
  });
});
