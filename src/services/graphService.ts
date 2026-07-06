import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import { buildOrgGraph } from "@/lib/orgGraphDemo";
import { buildMemoryGraph } from "@/lib/memoryGraphDemo";
import { currentDemoViewer } from "@/lib/aclDemo";
import { demoListQueue } from "@/lib/demoRequestsStore";
import { buildTeamLoad } from "@/lib/workloadMetrics";
import type {
  GraphEdge, GraphFilters, GraphMode, GraphNode, GraphPayload, NodeType,
} from "@/types/graph";

const IS_PREVIEW = isPreviewEnvironment();
const DEFAULT_LIMIT = 500;
const ALL_MEMORY_TYPES: NodeType[] = ["project", "task", "request", "page", "user"];

function mockGraph(): GraphPayload {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Users are the real request leads so the Network graph and the Workload page
  // tell the same story: workload points are stamped onto each person node
  // (§3.2/§4.5), so Jaclyn (over capacity) renders as the big vermilion-ringed
  // node and Dan smaller/healthy. Extra designers keep the constellation full.
  const team = buildTeamLoad(demoListQueue(), "all_open");
  const loadByKey = new Map(team.people.map((p) => [p.person.key, p]));
  const users: { key: string; label: string }[] = [
    { key: "jaclyn", label: "Jaclyn" },
    { key: "dan", label: "Dan" },
    { key: "u-riley", label: "Riley" },
    { key: "u-sam", label: "Sam" },
  ];
  users.forEach((u) => {
    const load = loadByKey.get(u.key);
    nodes.push({
      id: `user:${u.key}`,
      entityId: u.key,
      type: "user",
      label: u.label,
      metadata: {
        role: "designer",
        ...(load ? { workloadPoints: load.points, overloaded: load.band === "over" } : {}),
      },
    });
  });
  for (let i = 0; i < 5; i++) {
    nodes.push({
      id: `project:p${i}`, entityId: `p${i}`, type: "project",
      label: `Project ${i + 1}`, status: "active",
      metadata: { progress: 20 + i * 15 },
    });
    edges.push({
      id: `e-owns-${i}`, source: `user:${users[i % users.length].key}`,
      target: `project:p${i}`, type: "owns",
    });
  }
  for (let i = 0; i < 12; i++) {
    nodes.push({
      id: `task:t${i}`, entityId: `t${i}`, type: "task",
      label: `Task ${i + 1}`, status: i % 3 === 0 ? "done" : "active",
    });
    edges.push({
      id: `e-tassign-${i}`, source: `task:t${i}`,
      target: `user:${users[i % users.length].key}`, type: "assigned_to",
    });
    edges.push({
      id: `e-trel-${i}`, source: `task:t${i}`,
      target: `project:p${i % 5}`, type: "belongs_to",
    });
  }
  for (let i = 0; i < 4; i++) {
    nodes.push({
      id: `request:r${i}`, entityId: `r${i}`, type: "request",
      label: `ART-${100 + i}`, status: "in_review",
      metadata: { priority: ["low", "medium", "high", "urgent"][i] },
    });
    edges.push({
      id: `e-rassign-${i}`, source: `request:r${i}`,
      target: `user:${users[(i + 1) % users.length].key}`, type: "assigned_to",
    });
  }
  return { nodes, edges, truncated: false };
}

export async function fetchGraph(filters: GraphFilters = {}): Promise<GraphPayload> {
  if (IS_PREVIEW) return mockGraph();

  const limit = filters.limit ?? DEFAULT_LIMIT;
  const payload: Record<string, unknown> = {};
  if (filters.entity_types?.length) payload.entity_types = filters.entity_types;
  if (filters.relation_types?.length) payload.relation_types = filters.relation_types;
  if (filters.department_id) payload.department_id = filters.department_id;
  if (filters.center_type) payload.center_type = filters.center_type;
  if (filters.center_id) payload.center_id = filters.center_id;
  if (filters.depth) payload.depth = filters.depth;

  const { data, error } = await supabase.rpc("get_graph_data" as never, {
    p_filters: payload as never,
    p_limit: limit,
  } as never);
  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as
    | { nodes: GraphNode[] | null; edges: GraphEdge[] | null }
    | null;
  const nodes = (row?.nodes ?? []) as GraphNode[];
  const edges = (row?.edges ?? []) as GraphEdge[];
  return { nodes, edges, truncated: nodes.length >= limit };
}

/** Fallback viewer for the memory graph when the preview viewer isn't resolved yet. */
function memoryViewer() {
  return (
    currentDemoViewer() ?? {
      userId: "preview-user",
      isAdmin: false,
      departmentId: null,
      directReportIds: ["demo-user-report"],
    }
  );
}

/**
 * Unified graph fetch by mode. Network reuses get_graph_data; Org adds the
 * people/department hierarchy; Memory is the personal, ACL-scoped knowledge graph
 * (real mode reuses the RLS-scoped get_graph_data across all entity types).
 */
export async function fetchGraphFor(mode: GraphMode, filters: GraphFilters = {}): Promise<GraphPayload> {
  if (mode === "org") {
    if (IS_PREVIEW) return buildOrgGraph();
    const { data, error } = await supabase.rpc("get_org_chart_data" as never, {
      p_filters: {} as never,
      p_limit: filters.limit ?? DEFAULT_LIMIT,
    } as never);
    if (error) {
      // RPC not deployed yet → fall back to the network graph rather than erroring.
      return fetchGraph(filters);
    }
    const row = (Array.isArray(data) ? data[0] : data) as { nodes: GraphNode[] | null; edges: GraphEdge[] | null } | null;
    return { nodes: (row?.nodes ?? []) as GraphNode[], edges: (row?.edges ?? []) as GraphEdge[], truncated: false };
  }
  if (mode === "memory") {
    if (IS_PREVIEW) return buildMemoryGraph(memoryViewer());
    // Real memory graph = the AI knowledge graph (entities + concepts + extracted
    // edges), RLS-scoped and gated by can_view_memory (get_memory_graph). Falls
    // back to the plain entity graph if the KG RPC isn't deployed yet.
    return fetchMemoryGraph(filters);
  }
  return fetchGraph(filters);
}

/** Map a get_memory_graph edge row → GraphEdge, carrying provenance. */
function mapMemoryEdge(e: Record<string, unknown>): GraphEdge {
  return {
    id: String(e.id),
    source: String(e.source),
    target: String(e.target),
    type: e.type as GraphEdge["type"],
    edgeKind: (e.edge_kind ?? undefined) as GraphEdge["edgeKind"],
    confidence: (e.confidence ?? null) as number | null,
    rationale: (e.rationale ?? null) as string | null,
  };
}

/** Real AI knowledge graph via get_memory_graph (concepts + extracted edges). */
export async function fetchMemoryGraph(filters: GraphFilters = {}): Promise<GraphPayload> {
  if (IS_PREVIEW) return buildMemoryGraph(memoryViewer());
  const limit = filters.limit ?? DEFAULT_LIMIT;
  const { data, error } = await supabase.rpc("get_memory_graph" as never, {
    p_limit: limit,
  } as never);
  if (error) {
    // KG RPC not deployed yet → fall back to the plain RLS-scoped entity graph.
    return fetchGraph({ ...filters, entity_types: filters.entity_types ?? ALL_MEMORY_TYPES });
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { nodes: GraphNode[] | null; edges: Record<string, unknown>[] | null }
    | null;
  const nodes = (row?.nodes ?? []) as GraphNode[];
  const edges = (row?.edges ?? []).map(mapMemoryEdge);
  return { nodes, edges, truncated: nodes.length >= limit };
}

export async function expandNode(
  nodeType: NodeType, nodeId: string, depth = 1,
): Promise<GraphPayload> {
  if (IS_PREVIEW) return { nodes: [], edges: [], truncated: false };
  const { data, error } = await supabase.rpc("expand_node" as never, {
    p_node_type: nodeType, p_node_id: nodeId, p_depth: depth,
  } as never);
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as
    | { nodes: GraphNode[] | null; edges: GraphEdge[] | null }
    | null;
  return {
    nodes: (row?.nodes ?? []) as GraphNode[],
    edges: (row?.edges ?? []) as GraphEdge[],
    truncated: false,
  };
}