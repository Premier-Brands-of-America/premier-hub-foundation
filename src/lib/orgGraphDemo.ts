/**
 * Preview demo org tree (Feature 1) for the graph's "Org" mode and the /org route.
 *
 * Builds a clean three-level reports-to hierarchy (CEO → VPs → individual
 * contributors) from the real mock/directory users. Cleanup (spec §4):
 *  - We include ONLY people who have a manager OR at least one direct report, so
 *    the chart is a connected tree — never a cloud of isolated/orphan emails.
 *  - We DO NOT emit standalone department name-nodes (they cluttered the canvas
 *    as lone "MARKETING" bubbles). Instead each person carries `metadata.department`
 *    and the canvas colors the node by it, with a department color legend.
 *
 * On deploy this is replaced by the get_org_chart_data RPC backed by
 * org_directory + profiles.manager_email.
 */

import type { GraphEdge, GraphNode, GraphPayload } from "@/types/graph";

interface OrgSeed {
  id: string;
  name: string;
  title: string;
  department: string;
  office: string;
  managerId: string | null;
}

const ORG: OrgSeed[] = [
  { id: "ceo", name: "Dana Okafor", title: "Chief Executive Officer", department: "Executive", office: "New York", managerId: null },
  // VPs
  { id: "mock-uid-001", name: "Jane Doe", title: "VP, Marketing", department: "Marketing", office: "New York", managerId: "ceo" },
  { id: "mock-uid-002", name: "Alex Admin", title: "VP, Information Technology", department: "Information Technology", office: "San Francisco", managerId: "ceo" },
  { id: "vp-fin", name: "Pat Lee", title: "VP, Finance", department: "Finance", office: "Chicago", managerId: "ceo" },
  // Marketing ICs
  { id: "mock-uid-004", name: "Sam Smith", title: "Brand Manager", department: "Marketing", office: "New York", managerId: "mock-uid-001" },
  { id: "demo-user-other", name: "Morgan Vendel", title: "Account Manager", department: "Marketing", office: "New York", managerId: "mock-uid-001" },
  { id: "demo-user-report", name: "Riley Cho", title: "Designer", department: "Marketing", office: "New York", managerId: "mock-uid-001" },
  // IT ICs
  { id: "mock-uid-005", name: "Casey Chen", title: "Software Engineer", department: "Information Technology", office: "San Francisco", managerId: "mock-uid-002" },
  { id: "mock-uid-003", name: "Dana Diagnostics", title: "QA Analyst", department: "Information Technology", office: "San Francisco", managerId: "mock-uid-002" },
  // Finance ICs
  { id: "mock-uid-006", name: "Riley Roberts", title: "Financial Analyst", department: "Finance", office: "Chicago", managerId: "vp-fin" },
];

export function buildOrgGraph(): GraphPayload {
  // Who has at least one direct report? (used with "has a manager" to drop orphans)
  const hasReport = new Set<string>();
  for (const p of ORG) {
    if (p.managerId) hasReport.add(p.managerId);
  }

  // (a) Keep only people connected to the hierarchy: a manager OR ≥1 direct report.
  //     Isolated people (no manager, no reports) are dropped so the chart is a
  //     connected tree, not a scatter of disconnected emails.
  const kept = ORG.filter((p) => p.managerId !== null || hasReport.has(p.id));
  const keptIds = new Set(kept.map((p) => p.id));

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const p of kept) {
    nodes.push({
      id: `user:${p.id}`,
      entityId: p.id,
      type: "user",
      label: p.name,
      metadata: {
        jobTitle: p.title,
        // Department drives the node color + legend (no standalone dept bubbles).
        department: p.department,
        officeLocation: p.office,
        role: p.managerId === null ? "executive" : "member",
        managerId: p.managerId,
      },
    });
    // reports_to edge only when the manager is also in the kept set.
    if (p.managerId && keptIds.has(p.managerId)) {
      edges.push({
        id: `reports-${p.id}`,
        source: `user:${p.id}`,
        target: `user:${p.managerId}`,
        type: "reports_to",
        label: "reports to",
      });
    }
  }

  return { nodes, edges, truncated: false };
}
