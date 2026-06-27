import { describe, it, expect } from "vitest";
import {
  daysUntil,
  dueUrgency,
  dueLabel,
  isJustificationComplete,
} from "./dueDate";

const NOW = new Date("2026-06-27T12:00:00Z");

describe("daysUntil", () => {
  it("computes whole-day differences", () => {
    expect(daysUntil("2026-06-27T23:00:00Z", NOW)).toBe(0);
    expect(daysUntil("2026-06-30T01:00:00Z", NOW)).toBe(3);
    expect(daysUntil("2026-06-25T01:00:00Z", NOW)).toBe(-2);
  });
});

describe("dueUrgency", () => {
  it("classifies overdue / soon / normal / none", () => {
    expect(dueUrgency(null, NOW)).toBe("none");
    expect(dueUrgency("2026-06-25", NOW)).toBe("overdue");
    expect(dueUrgency("2026-06-27", NOW)).toBe("soon"); // today
    expect(dueUrgency("2026-06-29", NOW)).toBe("soon"); // within 3d
    expect(dueUrgency("2026-07-10", NOW)).toBe("normal");
  });

  it("respects a custom soon window", () => {
    expect(dueUrgency("2026-07-03", NOW, 7)).toBe("soon");
    expect(dueUrgency("2026-07-03", NOW, 3)).toBe("normal");
  });
});

describe("dueLabel", () => {
  it("produces friendly labels", () => {
    expect(dueLabel(null, NOW)).toBe("—");
    expect(dueLabel("2026-06-27", NOW)).toBe("Due today");
    expect(dueLabel("2026-06-28", NOW)).toBe("Due tomorrow");
    expect(dueLabel("2026-07-01", NOW)).toBe("Due in 4d");
    expect(dueLabel("2026-06-24", NOW)).toBe("Overdue 3d");
  });
});

describe("isJustificationComplete", () => {
  it("is satisfied when no due date is set", () => {
    expect(isJustificationComplete(null, null)).toBe(true);
  });
  it("requires reason + type when a due date is set", () => {
    expect(isJustificationComplete("2026-07-01", null)).toBe(false);
    expect(
      isJustificationComplete("2026-07-01", { reason: "", type: "Meeting" }),
    ).toBe(false);
    expect(
      isJustificationComplete("2026-07-01", {
        reason: "Client review",
        type: "Meeting",
      }),
    ).toBe(true);
  });
});
