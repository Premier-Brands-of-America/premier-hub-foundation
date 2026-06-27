import { describe, it, expect } from "vitest";
import {
  resolveItemVisibility,
  canViewItem,
  filterVisibleItems,
  type AclViewer,
  type AclItem,
} from "./acl";

const alice: AclViewer = { userId: "alice" };
const admin: AclViewer = { userId: "root", isAdmin: true };
const manager: AclViewer = { userId: "mgr", directReportIds: ["alice", "bob"] };

describe("resolveItemVisibility", () => {
  it("admin sees everything, including private items they have no relation to", () => {
    const item: AclItem = { ownerId: "someone", isPublic: false };
    expect(resolveItemVisibility(admin, item)).toEqual({ visible: true, reason: "admin" });
  });

  it("owner / lead / assignee / stakeholder / member each grant access", () => {
    expect(canViewItem(alice, { ownerId: "alice" })).toBe(true);
    expect(canViewItem(alice, { leadId: "alice" })).toBe(true);
    expect(canViewItem(alice, { assigneeId: "alice" })).toBe(true);
    expect(canViewItem(alice, { stakeholderIds: ["x", "alice"] })).toBe(true);
    expect(canViewItem(alice, { memberIds: ["alice"] })).toBe(true);
  });

  it("reports the most specific direct relation", () => {
    expect(resolveItemVisibility(alice, { ownerId: "alice" }).reason).toBe("owner");
    expect(resolveItemVisibility(alice, { assigneeId: "alice" }).reason).toBe("assignee");
  });

  it("public items are visible to anyone", () => {
    expect(resolveItemVisibility(alice, { ownerId: "bob", isPublic: true })).toEqual({
      visible: true,
      reason: "public",
    });
  });

  it("new/private items (default) are hidden from unrelated users", () => {
    // default private == isPublic falsy + no relation
    expect(canViewItem(alice, { ownerId: "bob" })).toBe(false);
    expect(canViewItem(alice, { ownerId: "bob", isPublic: false })).toBe(false);
  });

  it("a manager sees private items belonging to a direct report", () => {
    expect(resolveItemVisibility(manager, { ownerId: "alice" })).toEqual({
      visible: true,
      reason: "manager-of-report",
    });
    expect(canViewItem(manager, { assigneeId: "bob" })).toBe(true);
    expect(canViewItem(manager, { memberIds: ["alice"] })).toBe(true);
  });

  it("a manager does NOT see private items of non-reports", () => {
    expect(canViewItem(manager, { ownerId: "carol" })).toBe(false);
  });

  it("hides fully unrelated private items", () => {
    expect(resolveItemVisibility(alice, { ownerId: "bob", stakeholderIds: ["carol"] })).toEqual({
      visible: false,
      reason: "none",
    });
  });
});

describe("filterVisibleItems", () => {
  it("filters a mixed list for a plain user", () => {
    const items: AclItem[] = [
      { ownerId: "alice" }, // owner
      { ownerId: "bob", isPublic: true }, // public
      { ownerId: "bob" }, // hidden
      { stakeholderIds: ["alice"] }, // stakeholder
    ];
    expect(filterVisibleItems(alice, items)).toHaveLength(3);
  });

  it("returns everything for an admin", () => {
    const items: AclItem[] = [{ ownerId: "x" }, { ownerId: "y" }, { ownerId: "z" }];
    expect(filterVisibleItems(admin, items)).toHaveLength(3);
  });
});
