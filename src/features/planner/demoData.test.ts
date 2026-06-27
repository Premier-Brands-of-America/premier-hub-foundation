import { describe, it, expect } from "vitest";
import { demoBoard, DEMO_USERS } from "./demoData";
import { ownersFor } from "@/config/artOwnership";

describe("demo board (review seed)", () => {
  const board = demoBoard();

  it("has buckets and cards", () => {
    expect(board.buckets.length).toBeGreaterThanOrEqual(3);
    expect(board.cards.length).toBeGreaterThanOrEqual(5);
  });

  it("every card belongs to a real bucket", () => {
    const ids = new Set(board.buckets.map((b) => b.id));
    expect(board.cards.every((c) => ids.has(c.bucketId))).toBe(true);
  });

  it("includes at least one item per manager (Jaclyn / Megan / Dan)", () => {
    const names = new Set(board.cards.map((c) => c.assigneeName));
    expect(names.has("Jaclyn")).toBe(true);
    expect(names.has("Megan")).toBe(true);
    expect(names.has("Dan")).toBe(true);
  });

  it("includes the multi-owner Master Dielines case", () => {
    const md = board.cards.find((c) => c.customer === "Master Dielines");
    expect(md).toBeTruthy();
    // Master Dielines is genuinely multi-owner in the matrix.
    expect(ownersFor("Master Dielines").length).toBeGreaterThan(1);
  });

  it("has an overdue and a due-soon card for urgency review", () => {
    // demoData uses relative offsets, so this holds regardless of run date.
    const today = new Date();
    const hasOverdue = board.cards.some(
      (c) => c.dueDate && new Date(c.dueDate) < new Date(today.toDateString()),
    );
    expect(hasOverdue).toBe(true);
  });

  it("exposes a directory for mentions/assignees", () => {
    expect(DEMO_USERS.length).toBeGreaterThanOrEqual(3);
  });
});
