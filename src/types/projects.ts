/** Type definitions for project management */

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  visibility: "public" | "private";
  status: "active" | "complete";
  desired_due_date: string | null;
  updated_due_date: string | null;
  overall_percent_complete: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectStakeholder {
  id: string;
  project_id: string;
  user_id: string;
  percent_complete: number | null;
  added_at: string;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectActivity {
  id: string;
  project_id: string;
  user_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface ProjectAttachment {
  id: string;
  project_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  created_at: string;
}

export interface ProjectLink {
  id: string;
  project_id: string;
  user_id: string;
  url: string;
  label: string | null;
  created_at: string;
}

/** Enriched project with stakeholder list + owner name for display */
export interface ProjectWithMeta extends Project {
  owner_name?: string;
  owner_email?: string;
  stakeholders?: (ProjectStakeholder & { name?: string; email?: string })[];
}
