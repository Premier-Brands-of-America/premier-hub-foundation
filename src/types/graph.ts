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