import { describe, it, expect } from "vitest";
import {
  type AdminAccessGrant,
  isGrantActive,
  grantRemainingMs,
  resolveActiveGrant,
  targetTypeMeta,
} from "./adminAccess";

const NOW = new Date("2026-07-01T12:00:00Z").getTime();

function grant(over: Partial<AdminAccessGrant> = {}): AdminAccessGrant {
  return {
    id: "g1",
    admin_id: "admin",
    target_type: "project",
    target_id: "p1",
    reason: "support",
    created_at: "2026-07-01T11:30:00Z",
    expires_at: "2026-07-01T12:30:00Z", // +30m from NOW
    revoked_at: null,
    ...over,
  };
}

describe("isGrantActive", () => {
  it("active when not revoked and not expired", () => {
    expect(isGrantActive(grant(), NOW)).toBe(true);
  });
  it("inactive when expired", () => {
    expect(isGrantActive(grant({ expires_at: "2026-07-01T11:59:00Z" }), NOW)).toBe(false);
  });
  it("inactive when revoked (even if not yet expired)", () => {
    expect(isGrantActive(grant({ revoked_at: "2026-07-01T12:05:00Z" }), NOW)).toBe(false);
  });
});

describe("grantRemainingMs", () => {
  it("returns time to expiry for an active grant", () => {
    expect(grantRemainingMs(grant(), NOW)).toBe(30 * 60_000);
  });
  it("returns 0 for expired or revoked grants", () => {
    expect(grantRemainingMs(grant({ expires_at: "2026-07-01T11:00:00Z" }), NOW)).toBe(0);
    expect(grantRemainingMs(grant({ revoked_at: "2026-07-01T12:01:00Z" }), NOW)).toBe(0);
  });
});

describe("resolveActiveGrant", () => {
  const base = { userId: "admin", targetType: "project" as const, targetId: "p1" };

  it("finds an active grant for an admin", () => {
    const g = grant();
    expect(resolveActiveGrant([g], { isAdmin: true, ...base }, NOW)).toEqual(g);
  });
  it("returns null for a non-admin even if a grant row matches", () => {
    expect(resolveActiveGrant([grant()], { isAdmin: false, ...base }, NOW)).toBeNull();
  });
  it("ignores expired grants", () => {
    expect(
      resolveActiveGrant([grant({ expires_at: "2026-07-01T11:00:00Z" })], { isAdmin: true, ...base }, NOW),
    ).toBeNull();
  });
  it("ignores revoked grants", () => {
    expect(
      resolveActiveGrant([grant({ revoked_at: "2026-07-01T12:01:00Z" })], { isAdmin: true, ...base }, NOW),
    ).toBeNull();
  });
  it("ignores grants for a different item / admin / type", () => {
    expect(resolveActiveGrant([grant({ target_id: "other" })], { isAdmin: true, ...base }, NOW)).toBeNull();
    expect(resolveActiveGrant([grant({ admin_id: "someone" })], { isAdmin: true, ...base }, NOW)).toBeNull();
    expect(resolveActiveGrant([grant({ target_type: "task" })], { isAdmin: true, ...base }, NOW)).toBeNull();
  });
  it("picks the latest-expiring grant when several are active", () => {
    const near = grant({ id: "near", expires_at: "2026-07-01T12:10:00Z" });
    const far = grant({ id: "far", expires_at: "2026-07-01T13:00:00Z" });
    expect(resolveActiveGrant([near, far], { isAdmin: true, ...base }, NOW)?.id).toBe("far");
  });
});

describe("targetTypeMeta", () => {
  it("maps each target type to its Spanish label and app route", () => {
    expect(targetTypeMeta("project")).toMatchObject({ es: "proyecto", route: expect.any(Function) });
    expect(targetTypeMeta("task").es).toBe("tarea");
    expect(targetTypeMeta("page").es).toBe("página");
    expect(targetTypeMeta("project").route("p1")).toBe("/projects/p1");
    expect(targetTypeMeta("task").route("t1")).toBe("/tasks/t1");
    expect(targetTypeMeta("page").route("pg1")).toBe("/pages/pg1");
  });
});
