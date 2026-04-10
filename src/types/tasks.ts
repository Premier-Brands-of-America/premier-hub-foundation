/** Local type definitions for task-related tables */

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  percent_complete: number | null;
  status: "active" | "complete";
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskContact {
  id: string;
  task_id: string;
  contact_type: "internal" | "external";
  internal_user_id: string | null;
  name: string | null;
  email: string | null;
  created_at: string;
}

export interface TaskUpdate {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  created_at: string;
}

export interface TaskLink {
  id: string;
  task_id: string;
  user_id: string;
  url: string;
  label: string | null;
  created_at: string;
}

export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "text/plain",
  "text/csv",
];

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export const FILE_EXTENSIONS = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt,.csv";
