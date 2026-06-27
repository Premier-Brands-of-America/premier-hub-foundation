import { describe, it, expect } from "vitest";
import { buildOrgGraph } from "./orgGraphDemo";
import { buildMemoryGraph } from "./memoryGraphDemo";
import type { VisibilityViewer } from "./visibility";

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

  it("includes department nodes and user nodes", () => {
    expect(g.nodes.some((n) => n.type === "department" && n.label === "Marketing")).toBe(true);
    expect(g.nodes.some((n) => n.type === "user" && n.label === "Jane Doe")).toBe(true);
  });

  it("emits reports_to edges, and the CEO reports to no one", () => {
    const reports = g.edges.filter((e) => e.type === "reports_to");
    expect(reports.length).toBeGreaterThan(0);
    expect(reports.some((e) => e.source === "user:ceo")).toBe(false);
    // Sam Smith (uid-004) reports to Jane (uid-001)
    expect(reports.some((e) => e.source === "user:mock-uid-004" && e.target === "user:mock-uid-001")).toBe(true);
  });

  it("every user belongs to a department (member_of)", () => {
    const members = g.edges.filter((e) => e.type === "member_of");
    const users = g.nodes.filter((n) => n.type === "user");
    expect(members.length).toBe(users.length);
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

  it("an admin viewer sees the otherwise-hidden private project", () => {
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
