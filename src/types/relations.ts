export type EntityType = "project" | "task" | "request" | "page" | "user" | "department";

export type RelationType =
  | "relates_to"
  | "blocks"
  | "duplicate_of"
  | "parent_of"
  | "belongs_to"
  | "mentions";

export const RELATION_TYPES: RelationType[] = [
  "relates_to",
  "blocks",
  "duplicate_of",
  "parent_of",
  "belongs_to",
  "mentions",
];

export interface RelationRef {
  entityType: EntityType;
  entityId: string;
  title: string;
  subtitle?: string;
}

export interface Relation {
  id: string;
  direction: "incoming" | "outgoing";
  other_type: EntityType;
  other_id: string;
  relation_type: RelationType;
  created_at: string;
  other_title: string | null;
}