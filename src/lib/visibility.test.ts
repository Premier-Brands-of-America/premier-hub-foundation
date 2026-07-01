import { describe, it, expect, beforeEach } from "vitest";
import { canViewProjectRow, canViewTaskRow, canViewPageRow, type VisibilityViewer } from "./visibility";
import type { AdminAccessGrant } from "./adminAccess";

const user: VisibilityViewer = { userId: "u1", isAdmin: false, departmentId: "design", directReportIds: ["rep"] };
const admin: VisibilityViewer = { userId: "a1", isAdmin: true, departmentId: null, directReportIds: [] };

const GRANTS_KEY = "phv2:demo-admin-grants";
function seedGrant(g: Partial<AdminAccessGrant> & Pick<AdminAccessGrant, "target_type" | "target_id">) {
  const grant: AdminAccessGrant = {
    id: "g-" + g.target_id,
    admin_id: "a1",
    reason: "support",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
    revoked_at: null,
    ...g,
  };
  localStorage.setItem(GRANTS_KEY, JSON.stringify([grant]));
}

beforeEach(() => localStorage.clear());

describe("canViewProjectRow", () => {
  it("owner sees own private project", () => {
    expect(canViewProjectRow(user, { owner_id: "u1", visibility: "private" })).toBe(true);
  });
  it("public projects are visible", () => {
    expect(canViewProjectRow(user, { owner_id: "x", visibility: "public" })).toBe(true);
  });
  it("private projects of others are hidden", () => {
    expect(canViewProjectRow(user, { owner_id: "x", visibility: "private" })).toBe(false);
  });
  it("stakeholder sees a private project", () => {
    expect(canViewProjectRow(user, { owner_id: "x", visibility: "private" }, ["u1"])).toBe(true);
  });
  it("manager sees a direct report's private project (owner)", () => {
    expect(canViewProjectRow(user, { owner_id: "rep", visibility: "private" })).toBe(true);
  });
  it("manager sees a project where a direct report is a stakeholder", () => {
    expect(canViewProjectRow(user, { owner_id: "x", visibility: "private" }, ["rep"])).toBe(true);
  });
  it("admin does NOT see others' private project without an active grant", () => {
    expect(canViewProjectRow(admin, { id: "p9", owner_id: "x", visibility: "private" })).toBe(false);
  });
  it("admin sees the specific private project once a grant is active", () => {
    seedGrant({ target_type: "project", target_id: "p9" });
    expect(canViewProjectRow(admin, { id: "p9", owner_id: "x", visibility: "private" })).toBe(true);
    // grant is scoped to that one item, not everything
    expect(canViewProjectRow(admin, { id: "p10", owner_id: "x", visibility: "private" })).toBe(false);
  });
});

describe("canViewTaskRow", () => {
  it("owner + public + manager-of-owner; others' private hidden from admin without grant", () => {
    expect(canViewTaskRow(user, { user_id: "u1", visibility: "private" })).toBe(true);
    expect(canViewTaskRow(user, { user_id: "x", visibility: "public" })).toBe(true);
    expect(canViewTaskRow(user, { user_id: "rep", visibility: "private" })).toBe(true);
    expect(canViewTaskRow(user, { user_id: "x", visibility: "private" })).toBe(false);
    expect(canViewTaskRow(admin, { id: "t9", user_id: "x", visibility: "private" })).toBe(false);
  });
  it("admin sees a private task once a grant is active", () => {
    seedGrant({ target_type: "task", target_id: "t9" });
    expect(canViewTaskRow(admin, { id: "t9", user_id: "x", visibility: "private" })).toBe(true);
  });
});

describe("canViewPageRow", () => {
  it("owner, public, department, share, manager-of-owner", () => {
    expect(canViewPageRow(user, { owner_id: "u1", visibility: "private" })).toBe(true);
    expect(canViewPageRow(user, { owner_id: "x", visibility: "public" })).toBe(true);
    expect(canViewPageRow(user, { owner_id: "x", visibility: "department", department_id: "design" })).toBe(true);
    expect(canViewPageRow(user, { owner_id: "x", visibility: "department", department_id: "ops" })).toBe(false);
    expect(
      canViewPageRow(user, { owner_id: "x", visibility: "private", shares: [{ granteeId: "u1", role: "view" }] }),
    ).toBe(true);
    expect(canViewPageRow(user, { owner_id: "rep", visibility: "private" })).toBe(true);
    expect(canViewPageRow(user, { owner_id: "x", visibility: "private" })).toBe(false);
  });
  it("admin does NOT see others' private page without a grant, but does with one", () => {
    expect(canViewPageRow(admin, { id: "pg9", owner_id: "x", visibility: "private" })).toBe(false);
    seedGrant({ target_type: "page", target_id: "pg9" });
    expect(canViewPageRow(admin, { id: "pg9", owner_id: "x", visibility: "private" })).toBe(true);
  });
});
