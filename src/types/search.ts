export type SearchEntityType = "project" | "task" | "request" | "page";

export interface SearchHit {
  entity_type: SearchEntityType;
  id: string;
  title: string;
  snippet: string;
  rank: number;
}

export interface PeopleHit {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  department: string | null;
}