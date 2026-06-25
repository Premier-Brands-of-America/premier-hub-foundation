export type NodeType = "project" | "task" | "request" | "page" | "user" | "department";

export type RelationType =
  | "owns" | "stakeholder" | "assigned_to" | "belongs_to"
  | "relates_to" | "blocks" | "duplicate_of" | "parent_of"
  | "mentions" | "linked_from";

export interface GraphNode {
  id: string;
  entityId: string;
  type: NodeType;
  label: string;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  x?: number; y?: number;
  fx?: number | null; fy?: number | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  label?: string;
}

export interface GraphFilters {
  entity_types?: NodeType[];
  relation_types?: RelationType[];
  department_id?: string;
  center_type?: NodeType;
  center_id?: string;
  depth?: number;
  search?: string;
  limit?: number;
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated: boolean;
}

/** Client-side view filters applied after fetch (no refetch). */
export interface GraphViewFilters {
  statuses?: string[];   // undefined = all statuses visible
  hideOrphans?: boolean; // drop degree-0 nodes
  search?: string;       // dims non-matching nodes (does not remove them)
}

/** d3-force tuning, exposed as sliders (mirrors Obsidian's four forces + node size). */
export interface GraphForces {
  charge: number;        // repel force (negative = repel)
  linkDistance: number;  // resting edge length
  linkStrength: number;  // rubber-band tension 0..1
  center: number;        // center-pull strength 0..1
  nodeSize: number;      // global node radius scale (nodeRelSize)
}

export const DEFAULT_FORCES: GraphForces = {
  charge: -120,
  linkDistance: 60,
  linkStrength: 0.7,
  center: 0.1,
  nodeSize: 5,
};