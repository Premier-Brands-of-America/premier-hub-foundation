import type { Role } from "@/hooks/useRole";

export interface RequestLike {
  assignee_id?: string | null;
  requester_id?: string | null;
  department_id?: string | null;
}

export const canAssignDesigner = (role: Role | null) => role === "admin";
export const canChangePriority = (role: Role | null) => role === "admin";
export const canArchive = (role: Role | null) => role === "admin";

export const canUpdateStatus = (role: Role | null, request: RequestLike, currentUserId: string | null) =>
  role === "admin" || (role === "designer" && !!request.assignee_id && request.assignee_id === currentUserId);

export const canUploadFiles = (role: Role | null, request: RequestLike, currentUserId: string | null) =>
  role !== "requester" || request.requester_id === currentUserId;

export const canViewRequest = (
  role: Role | null,
  request: RequestLike,
  currentUserId: string | null,
  departmentId: string | null,
) => {
  if (role === "admin" || role === "designer") return true;
  if (role === "requester") {
    if (request.requester_id && request.requester_id === currentUserId) return true;
    if (request.department_id && departmentId && request.department_id === departmentId) return true;
  }
  return false;
};
