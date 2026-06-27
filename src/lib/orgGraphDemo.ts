/**
 * Preview demo org tree (Feature 1) for the graph's "Org" mode and the /org route.
 *
 * Builds a clean three-level reports-to hierarchy (CEO → VPs → individual
 * contributors) including the real mock/directory users as leaves, plus
 * department nodes (member_of edges). On deploy this is replaced by the
 * get_org_chart_data RPC backed by org_directory + profiles.manager_email.
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

const DEPARTMENTS = [
  { id: "Executive", office: "New York" },
  { id: "Marketing", office: "New York" },
  { id: "Information Technology", office: "San Francisco" },
  { id: "Finance", office: "Chicago" },
];

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
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const d of DEPARTMENTS) {
    nodes.push({
      id: `department:${d.id}`,
      entityId: d.id,
      type: "department",
      label: d.id,
      metadata: { officeLocation: d.office },
    });
  }

  for (const p of ORG) {
    nodes.push({
      id: `user:${p.id}`,
      entityId: p.id,
      type: "user",
      label: p.name,
      metadata: {
        jobTitle: p.title,
        department: p.department,
        officeLocation: p.office,
        role: p.managerId === null ? "executive" : "member",
        managerId: p.managerId,
      },
    });
    edges.push({
      id: `member-${p.id}`,
      source: `user:${p.id}`,
      target: `department:${p.department}`,
      type: "member_of",
    });
    if (p.managerId) {
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
