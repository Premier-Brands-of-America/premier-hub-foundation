import { describe, it, expect } from "vitest";
import {
  onAssignment,
  onComment,
  onStatusChange,
  onDueDateSweep,
  type ItemRef,
} from "./notificationTriggers";

const item: ItemRef = {
  entityType: "request",
  id: "r-1",
  title: "Kroger summer cap",
  link: "/portal/requests/r-1",
};

describe("onAssignment", () => {
  it("notifies the assignee", () => {
    const rows = onAssignment(item, "u-2", "u-1");
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe("u-2");
    expect(rows[0].action_type).toBe("assigned");
  });
  it("does not notify when assigning to self", () => {
    expect(onAssignment(item, "u-1", "u-1")).toEqual([]);
  });
});

describe("onComment", () => {
  it("notifies mentioned users and watchers, excluding the actor", () => {
    const text = "Looks good @[Megan](u-2) — @[Dan](u-3) thoughts?";
    const rows = onComment(item, text, "u-1", ["u-1", "u-4"]);
    const byUser = Object.fromEntries(rows.map((r) => [r.user_id, r.action_type]));
    expect(byUser["u-2"]).toBe("mention");
    expect(byUser["u-3"]).toBe("mention");
    expect(byUser["u-4"]).toBe("comment");
    expect(byUser["u-1"]).toBeUndefined(); // actor excluded
  });
  it("does not double-notify a watcher who is also mentioned", () => {
    const rows = onComment(item, "@[Megan](u-2)!", "u-1", ["u-2"]);
    expect(rows).toHaveLength(1);
    expect(rows[0].action_type).toBe("mention");
  });
});

describe("onStatusChange", () => {
  it("notifies watchers of the transition", () => {
    const rows = onStatusChange(item, "submitted", "assigned", "u-1", [
      "u-1",
      "u-2",
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe("u-2");
    expect(rows[0].message).toContain("submitted");
    expect(rows[0].message).toContain("assigned");
  });
});

describe("onDueDateSweep", () => {
  const now = new Date("2026-06-27T12:00:00Z");
  it("emits overdue reminders", () => {
    const rows = onDueDateSweep(item, "2026-06-20", ["u-2"], now);
    expect(rows[0].action_type).toBe("overdue");
    expect(rows[0].type).toBe("warning");
  });
  it("emits due-soon reminders", () => {
    const rows = onDueDateSweep(item, "2026-06-28", ["u-2"], now);
    expect(rows[0].action_type).toBe("due_soon");
  });
  it("is silent when due date is comfortably in the future", () => {
    expect(onDueDateSweep(item, "2026-08-01", ["u-2"], now)).toEqual([]);
  });
  it("is silent when there is no due date", () => {
    expect(onDueDateSweep(item, null, ["u-2"], now)).toEqual([]);
  });
});
