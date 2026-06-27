import { describe, it, expect } from "vitest";
import { canViewProjectRow, canViewTaskRow, canViewPageRow, type VisibilityViewer } from "./visibility";

const user: VisibilityViewer = { userId: "u1", isAdmin: false, departmentId: "design", directReportIds: ["rep"] };
const admin: VisibilityViewer = { userId: "a1", isAdmin: true, departmentId: null, directReportIds: [] };

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
  it("admin sees everything", () => {
    expect(canViewProjectRow(admin, { owner_id: "x", visibility: "private" })).toBe(true);
  });
});

describe("canViewTaskRow", () => {
  it("owner + public + manager-of-owner + admin", () => {
    expect(canViewTaskRow(user, { user_id: "u1", visibility: "private" })).toBe(true);
    expect(canViewTaskRow(user, { user_id: "x", visibility: "public" })).toBe(true);
    expect(canViewTaskRow(user, { user_id: "rep", visibility: "private" })).toBe(true);
    expect(canViewTaskRow(user, { user_id: "x", visibility: "private" })).toBe(false);
    expect(canViewTaskRow(admin, { user_id: "x", visibility: "private" })).toBe(true);
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
});
