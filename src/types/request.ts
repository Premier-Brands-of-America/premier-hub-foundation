export type RequestType = "easy" | "full_brief";
export type RequestPriority = "low" | "medium" | "high" | "urgent";
export type RequestStatus =
  | "submitted"
  | "in_review"
  | "assigned"
  | "in_progress"
  | "waiting_on_info"
  | "internal_review"
  | "sent_for_approval"
  | "complete"
  | "archived";

export interface ArtRequest {
  id: string;
  request_number: string;
  title: string;
  description: string;
  request_type: RequestType;
  priority: RequestPriority;
  status: RequestStatus;
  requester_id: string;
  department_id: string;
  assignee_id: string | null;
  due_date: string | null;
  submitted_at: string | null;
  assigned_at: string | null;
  completed_at: string | null;
  archived_at: string | null;
  sharepoint_folder_url: string | null;
  sharepoint_folder_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateRequestPayload {
  title: string;
  description: string;
  request_type: RequestType;
  priority?: RequestPriority;
  requester_id: string;
  department_id: string;
  due_date?: string | null;
  metadata?: Record<string, unknown>;
}

export type UpdateRequestPatch = Partial<
  Pick<
    ArtRequest,
    | "title"
    | "description"
    | "priority"
    | "status"
    | "assignee_id"
    | "due_date"
    | "sharepoint_folder_url"
    | "sharepoint_folder_id"
    | "metadata"
    | "assigned_at"
    | "completed_at"
    | "archived_at"
  >
>;