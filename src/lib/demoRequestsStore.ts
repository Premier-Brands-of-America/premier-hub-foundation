// Preview/demo persistence for Art Department requests (no live DB).
// Lets submitted requests actually appear in My Requests / Queue / Department
// Workload so the team-workload view is testable. Backed by localStorage.
import type { ArtRequest, CreateRequestPayload, UpdateRequestPatch } from "@/types/request";

const KEY = "phv2:demo-requests";

function now(): string { return new Date().toISOString(); }
function daysAgo(d: number): string { return new Date(Date.now() - d * 86_400_000).toISOString(); }
function daysAhead(d: number): string { return new Date(Date.now() + d * 86_400_000).toISOString(); }

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
  // A richer spread (departments, statuses, priorities, assignees, due dates,
  // and submission dates across several weeks) so the Reports dashboard and
  // Department Workload render meaningful charts in preview.
  return [
    base({ request_number: "ART-1001", title: "Kroger summer endcap refresh", description: "Endcap creative for summer promo.", priority: "high", status: "submitted", requester_id: "mock-uid-001", department_id: "dept-art", due_date: daysAhead(5), created_at: daysAgo(2), submitted_at: daysAgo(2), metadata: { customer: "Kroger", project_lead: "jaclyn", assigned_manager: "jaclyn" } }),
    base({ request_number: "ART-1002", title: "Trojan promo banner set", description: "Banner set for Q3 promo.", priority: "medium", status: "in_progress", requester_id: "mock-uid-002", department_id: "dept-mkt", assignee_id: "mock-uid-003", due_date: daysAhead(2), created_at: daysAgo(6), submitted_at: daysAgo(6), assigned_at: daysAgo(5), metadata: { customer: "Trojan", project_lead: "dan", assigned_manager: "dan" } }),
    base({ request_number: "ART-1003", title: "CVS Caring Mill label proof", description: "Label proof, overdue.", priority: "urgent", status: "assigned", requester_id: "mock-uid-003", department_id: "dept-art", assignee_id: "mock-uid-005", due_date: daysAgo(1), created_at: daysAgo(9), submitted_at: daysAgo(9), assigned_at: daysAgo(8), metadata: { customer: "CVS", project_lead: "jaclyn", assigned_manager: "jaclyn" } }),
    base({ request_number: "ART-1004", title: "Walgreens shelf talker", description: "Shelf talker set.", priority: "low", status: "in_review", requester_id: "mock-uid-004", department_id: "dept-mkt", due_date: daysAhead(10), created_at: daysAgo(11), submitted_at: daysAgo(11), metadata: { customer: "Walgreens", project_lead: "dan", assigned_manager: "dan" } }),
    base({ request_number: "ART-1005", title: "Target holiday cap art", description: "Holiday endcap.", priority: "high", status: "in_progress", requester_id: "mock-uid-001", department_id: "dept-art", assignee_id: "mock-uid-005", due_date: daysAhead(1), created_at: daysAgo(13), submitted_at: daysAgo(13), assigned_at: daysAgo(12), metadata: { customer: "Target", project_lead: "jaclyn", assigned_manager: "jaclyn" } }),
    base({ request_number: "ART-1006", title: "Costco club pack mockup", description: "Club pack.", priority: "medium", status: "complete", requester_id: "mock-uid-002", department_id: "dept-mkt", assignee_id: "mock-uid-003", due_date: daysAgo(3), created_at: daysAgo(20), submitted_at: daysAgo(20), assigned_at: daysAgo(19), completed_at: daysAgo(4), metadata: { customer: "Costco", project_lead: "dan", assigned_manager: "dan" } }),
    base({ request_number: "ART-1007", title: "Sephora gift set sleeve", description: "Gift sleeve.", priority: "medium", status: "sent_for_approval", requester_id: "mock-uid-006", department_id: "dept-art", assignee_id: "mock-uid-005", due_date: daysAhead(4), created_at: daysAgo(15), submitted_at: daysAgo(15), assigned_at: daysAgo(14), metadata: { customer: "Sephora", project_lead: "jaclyn", assigned_manager: "jaclyn" } }),
    base({ request_number: "ART-1008", title: "Amazon A+ content", description: "A+ modules.", priority: "high", status: "waiting_on_info", requester_id: "mock-uid-004", department_id: "dept-mkt", assignee_id: "mock-uid-003", due_date: daysAhead(7), created_at: daysAgo(18), submitted_at: daysAgo(18), assigned_at: daysAgo(17), metadata: { customer: "Amazon", project_lead: "dan", assigned_manager: "dan" } }),
    base({ request_number: "ART-1009", title: "Dollar General planogram", description: "Planogram art.", priority: "low", status: "complete", requester_id: "mock-uid-001", department_id: "dept-art", assignee_id: "mock-uid-005", due_date: daysAgo(10), created_at: daysAgo(28), submitted_at: daysAgo(28), assigned_at: daysAgo(27), completed_at: daysAgo(12), metadata: { customer: "Dollar General", project_lead: "jaclyn", assigned_manager: "jaclyn" } }),
    base({ request_number: "ART-1010", title: "Whole Foods signage", description: "Store signage.", priority: "urgent", status: "internal_review", requester_id: "mock-uid-006", department_id: "dept-mkt", assignee_id: "mock-uid-003", due_date: daysAhead(3), created_at: daysAgo(8), submitted_at: daysAgo(8), assigned_at: daysAgo(7), metadata: { customer: "Whole Foods", project_lead: "dan", assigned_manager: "dan" } }),
    base({ request_number: "ART-1011", title: "Publix BOGO tags", description: "BOGO tags.", priority: "medium", status: "submitted", requester_id: "mock-uid-004", department_id: "dept-art", due_date: daysAhead(12), created_at: daysAgo(1), submitted_at: daysAgo(1), metadata: { customer: "Publix", project_lead: "jaclyn", assigned_manager: "jaclyn" } }),
    base({ request_number: "ART-1012", title: "Meijer circular spread", description: "Weekly circular.", priority: "high", status: "complete", requester_id: "mock-uid-002", department_id: "dept-mkt", assignee_id: "mock-uid-005", due_date: daysAgo(20), created_at: daysAgo(34), submitted_at: daysAgo(34), assigned_at: daysAgo(33), completed_at: daysAgo(22), metadata: { customer: "Meijer", project_lead: "dan", assigned_manager: "dan" } }),
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
/** All requests (any status), newest-first. Used by the Reports dashboard. */
export function demoListAll(): ArtRequest[] {
  return load().sort((a, b) => b.created_at.localeCompare(a.created_at));
}
export function demoUpdateRequest(id: string, patch: UpdateRequestPatch): ArtRequest {
  const list = load();
  const i = list.findIndex((r) => r.id === id);
  if (i < 0) throw new Error("Request not found (demo)");
  list[i] = { ...list[i], ...patch, updated_at: now() } as ArtRequest;
  save(list);
  return list[i];
}
