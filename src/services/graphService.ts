import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import type {
  GraphEdge, GraphFilters, GraphNode, GraphPayload, NodeType,
} from "@/types/graph";

const IS_PREVIEW = isPreviewEnvironment();
const DEFAULT_LIMIT = 500;

function mockGraph(): GraphPayload {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const users = ["Alex", "Sam", "Jordan", "Riley"];
  users.forEach((n, i) =>
    nodes.push({
      id: `user:u${i}`, entityId: `u${i}`, type: "user", label: n,
      metadata: { role: "designer" },
    }),
  );
  for (let i = 0; i < 5; i++) {
    nodes.push({
      id: `project:p${i}`, entityId: `p${i}`, type: "project",
      label: `Project ${i + 1}`, status: "active",
      metadata: { progress: 20 + i * 15 },
    });
    edges.push({
      id: `e-owns-${i}`, source: `user:u${i % users.length}`,
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
      target: `user:u${i % users.length}`, type: "assigned_to",
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
      target: `user:u${(i + 1) % users.length}`, type: "assigned_to",
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