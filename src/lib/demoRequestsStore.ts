// Preview/demo persistence for Art Department requests (no live DB).
// Lets submitted requests actually appear in My Requests / Queue / Department
// Workload so the team-workload view is testable. Backed by localStorage.
import type { ArtRequest, CreateRequestPayload, UpdateRequestPatch } from "@/types/request";

const KEY = "phv2:demo-requests";

function now(): string { return new Date().toISOString(); }

function seed(): ArtRequest[] {
  const base = (over: Partial<ArtRequest>): ArtRequest => ({
    id: "demo-seed-" + Math.random().toString(36).slice(2, 9),
    request_number: "ART-0000",
    title: "", description: "", request_type: "easy",
    priority: "medium", status: "submitted",
    requester_id: "mock-uid-001", department_id: "dept-art",
    assignee_id: null, due_date: null, submitted_at: now(),
    assigned_at: null, completed_at: null, archived_at: null,
    sharepoint_folder_url: null, sharepoint_folder_id: null,
    metadata: {}, created_at: now(), updated_at: now(),
    ...over,
  });
  return [
    base({ request_number: "ART-1001", title: "Kroger summer endcap refresh", description: "Endcap creative for summer promo.", priority: "high", status: "submitted", requester_id: "mock-uid-001", department_id: "dept-art", metadata: { customer: "Kroger", project_lead: "jaclyn", assigned_manager: "jaclyn" } }),
    base({ request_number: "ART-1002", title: "Trojan promo banner set", description: "Banner set for Q3 promo.", priority: "medium", status: "in_progress", requester_id: "mock-uid-002", department_id: "dept-mkt", assignee_id: "mock-uid-003", metadata: { customer: "Trojan", project_lead: "dan", assigned_manager: "dan" } }),
    base({ request_number: "ART-1003", title: "CVS Caring Mill label proof", description: "Label proof, overdue.", priority: "urgent", status: "assigned", requester_id: "mock-uid-003", department_id: "dept-art", metadata: { customer: "CVS", project_lead: "jaclyn", assigned_manager: "jaclyn" } }),
  ];
}

function load(): ArtRequest[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) { const s = seed(); localStorage.setItem(KEY, JSON.stringify(s)); return s; }
    return JSON.parse(raw) as ArtRequest[];
  } catch { return seed(); }
}
function save(list: ArtRequest[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* noop */ }
}

const OPEN = new Set(["submitted","in_review","assigned","in_progress","waiting_on_info","internal_review","sent_for_approval"]);

export function demoCreateRequest(p: CreateRequestPayload): ArtRequest {
  const list = load();
  const n = 1004 + list.filter((r) => r.request_number.startsWith("ART-1")).length;
  const req: ArtRequest = {
    id: "demo-req-" + Date.now(),
    request_number: "ART-" + n,
    title: p.title, description: p.description, request_type: p.request_type,
    priority: p.priority ?? "medium", status: "submitted",
    requester_id: p.requester_id, department_id: p.department_id,
    assignee_id: null, due_date: p.due_date ?? null, submitted_at: now(),
    assigned_at: null, completed_at: null, archived_at: null,
    sharepoint_folder_url: null, sharepoint_folder_id: null,
    metadata: p.metadata ?? {}, created_at: now(), updated_at: now(),
  };
  save([req, ...list]);
  return req;
}
export function demoGetRequest(id: string): ArtRequest | null {
  return load().find((r) => r.id === id) ?? null;
}
export function demoListMine(userId: string): ArtRequest[] {
  return load().filter((r) => r.requester_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at));
}
export function demoListDepartment(deptId: string): ArtRequest[] {
  return load().filter((r) => r.department_id === deptId).sort((a, b) => b.created_at.localeCompare(a.created_at));
}
export function demoListQueue(): ArtRequest[] {
  return load().filter((r) => OPEN.has(r.status)).sort((a, b) => (b.priority).localeCompare(a.priority));
}
export function demoUpdateRequest(id: string, patch: UpdateRequestPatch): ArtRequest {
  const list = load();
  const i = list.findIndex((r) => r.id === id);
  if (i < 0) throw new Error("Request not found (demo)");
  list[i] = { ...list[i], ...patch, updated_at: now() } as ArtRequest;
  save(list);
  return list[i];
}
