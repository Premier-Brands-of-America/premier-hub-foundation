export type PageVisibility = "public" | "private" | "department";

export interface Page {
  id: string;
  title: string;
  slug: string | null;
  body: unknown;
  body_md: string | null;
  body_text: string | null;
  parent_id: string | null;
  owner_id: string;
  visibility: PageVisibility;
  department_id: string | null;
  icon: string | null;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface PageTreeNode {
  id: string;
  title: string;
  parent_id: string | null;
  icon: string | null;
  depth: number;
}

export interface BacklinkRow {
  source_page_id: string;
  source_title: string;
  snippet: string;
  created_at: string;
}

export type BacklinkTargetType = "page" | "project" | "task" | "request" | "user";