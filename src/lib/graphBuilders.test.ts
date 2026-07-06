import { describe, it, expect, beforeEach } from "vitest";
import { buildOrgGraph } from "./orgGraphDemo";
import { buildMemoryGraph } from "./memoryGraphDemo";
import type { VisibilityViewer } from "./visibility";
import type { AdminAccessGrant } from "./adminAccess";

beforeEach(() => localStorage.clear());

function seedGrant(adminId: string, targetId: string) {
  const grant: AdminAccessGrant = {
    id: "g1",
    admin_id: adminId,
    target_type: "project",
    target_id: targetId,
    reason: "support",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
    revoked_at: null,
  };
  localStorage.setItem("phv2:demo-admin-grants", JSON.stringify([grant]));
}

const standard: VisibilityViewer = {
  userId: "mock-uid-001",
  isAdmin: false,
  departmentId: null,
  directReportIds: ["demo-user-report"],
};
const admin: VisibilityViewer = {
  userId: "mock-uid-002",
  isAdmin: true,
  departmentId: null,
  directReportIds: [],
};

describe("buildOrgGraph", () => {
  const g = buildOrgGraph();

  it("emits user nodes carrying their department in metadata (no standalone dept bubbles)", () => {
    // Cleanup (spec §4): department name-nodes are removed; department is a color.
    expect(g.nodes.some((n) => n.type === "department")).toBe(false);
    const jane = g.nodes.find((n) => n.type === "user" && n.label === "Jane Doe");
    expect(jane).toBeDefined();
    expect((jane?.metadata as Record<string, unknown>)?.department).toBe("Marketing");
  });

  it("emits reports_to edges, and the CEO reports to no one", () => {
    const reports = g.edges.filter((e) => e.type === "reports_to");
    expect(reports.length).toBeGreaterThan(0);
    expect(reports.some((e) => e.source === "user:ceo")).toBe(false);
    // Sam Smith (uid-004) reports to Jane (uid-001)
    expect(reports.some((e) => e.source === "user:mock-uid-004" && e.target === "user:mock-uid-001")).toBe(true);
  });

  it("emits no member_of edges (departments are color-coded, not nodes)", () => {
    expect(g.edges.some((e) => e.type === "member_of")).toBe(false);
  });

  it("includes only people with a manager or a direct report (no orphans)", () => {
    // Every kept user is either the CEO (has reports) or has a managerId.
    const userIds = new Set(g.nodes.filter((n) => n.type === "user").map((n) => n.entityId));
    const managerTargets = new Set(
      g.edges.filter((e) => e.type === "reports_to").map((e) => String(e.target).replace(/^user:/, "")),
    );
    for (const n of g.nodes.filter((x) => x.type === "user")) {
      const managerId = (n.metadata as Record<string, unknown>)?.managerId ?? null;
      const isManager = managerTargets.has(n.entityId);
      expect(managerId !== null || isManager).toBe(true);
    }
    // sanity: the CEO is present (has reports) and Jane is present (has a manager)
    expect(userIds.has("ceo")).toBe(true);
    expect(userIds.has("mock-uid-001")).toBe(true);
  });
});

describe("buildMemoryGraph (ACL-scoped)", () => {
  it("hides another user's private project from a standard viewer", () => {
    const g = buildMemoryGraph(standard);
    expect(g.nodes.some((n) => n.id === "project:demo-acl-p3")).toBe(false);
    // but owner/public/manager/stakeholder projects are present
    expect(g.nodes.some((n) => n.id === "project:demo-acl-p1")).toBe(true);
    expect(g.nodes.some((n) => n.id === "project:demo-acl-p4")).toBe(true);
  });

  it("an admin does NOT passively see the hidden private project (break-glass)", () => {
    const g = buildMemoryGraph(admin);
    expect(g.nodes.some((n) => n.id === "project:demo-acl-p3")).toBe(false);
  });

  it("an admin sees the hidden private project once a break-glass grant is active", () => {
    seedGrant(admin.userId, "demo-acl-p3");
    const g = buildMemoryGraph(admin);
    expect(g.nodes.some((n) => n.id === "project:demo-acl-p3")).toBe(true);
  });

  it("includes a notes hub and only edges whose endpoints exist", () => {
    const g = buildMemoryGraph(standard);
    expect(g.nodes.some((n) => n.type === "page")).toBe(true);
    const ids = new Set(g.nodes.map((n) => n.id));
    for (const e of g.edges) {
      expect(ids.has(e.source as string)).toBe(true);
      expect(ids.has(e.target as string)).toBe(true);
    }
  });
});
