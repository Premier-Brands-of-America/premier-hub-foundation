import { describe, it, expect } from "vitest";
import {
  resolvePageAccess,
  canViewPage,
  canEditPage,
  filterViewablePages,
  type PageAccessViewer,
  type PageAccessItem,
} from "./pageShare";

const owner: PageAccessViewer = { userId: "owner" };
const admin: PageAccessViewer = { userId: "root", isAdmin: true };
const alice: PageAccessViewer = { userId: "alice", departmentId: "design" };
const stranger: PageAccessViewer = { userId: "zed", departmentId: "ops" };

const privatePage: PageAccessItem = { ownerId: "owner", visibility: "private" };

describe("resolvePageAccess", () => {
  it("admin always gets edit", () => {
    expect(resolvePageAccess(admin, privatePage)).toEqual({ level: "edit", reason: "admin" });
  });

  it("owner gets edit", () => {
    expect(resolvePageAccess(owner, privatePage)).toEqual({ level: "edit", reason: "owner" });
  });

  it("private pages are invisible to unrelated users", () => {
    expect(resolvePageAccess(alice, privatePage)).toEqual({ level: "none", reason: "none" });
  });

  it("per-person view share grants view", () => {
    const page: PageAccessItem = {
      ownerId: "owner",
      visibility: "private",
      shares: [{ granteeId: "alice", role: "view" }],
    };
    expect(resolvePageAccess(alice, page)).toEqual({ level: "view", reason: "shared-view" });
    expect(canViewPage(alice, page)).toBe(true);
    expect(canEditPage(alice, page)).toBe(false);
  });

  it("per-person edit share grants edit", () => {
    const page: PageAccessItem = {
      ownerId: "owner",
      visibility: "private",
      shares: [{ granteeId: "alice", role: "edit" }],
    };
    expect(canEditPage(alice, page)).toBe(true);
  });

  it("a share does not leak to other users", () => {
    const page: PageAccessItem = {
      ownerId: "owner",
      visibility: "private",
      shares: [{ granteeId: "alice", role: "edit" }],
    };
    expect(canViewPage(stranger, page)).toBe(false);
  });

  it("public pages are viewable by anyone (view only)", () => {
    const page: PageAccessItem = { ownerId: "owner", visibility: "public" };
    expect(resolvePageAccess(stranger, page)).toEqual({ level: "view", reason: "public" });
  });

  it("department pages are viewable only within the department", () => {
    const page: PageAccessItem = { ownerId: "owner", visibility: "department", departmentId: "design" };
    expect(resolvePageAccess(alice, page).level).toBe("view");
    expect(resolvePageAccess(alice, page).reason).toBe("department");
    expect(resolvePageAccess(stranger, page).level).toBe("none");
  });

  it("an edit share overrides a weaker public/department view", () => {
    const page: PageAccessItem = {
      ownerId: "owner",
      visibility: "public",
      shares: [{ granteeId: "alice", role: "edit" }],
    };
    expect(resolvePageAccess(alice, page)).toEqual({ level: "edit", reason: "shared-edit" });
  });
});

describe("filterViewablePages", () => {
  it("filters a mixed list for a department member", () => {
    const pages: PageAccessItem[] = [
      { ownerId: "alice", visibility: "private" }, // owner
      { ownerId: "x", visibility: "public" }, // public
      { ownerId: "x", visibility: "department", departmentId: "design" }, // same dept
      { ownerId: "x", visibility: "department", departmentId: "ops" }, // other dept
      { ownerId: "x", visibility: "private", shares: [{ granteeId: "alice", role: "view" }] }, // shared
      { ownerId: "x", visibility: "private" }, // hidden
    ];
    expect(filterViewablePages(alice, pages)).toHaveLength(4);
  });
});
