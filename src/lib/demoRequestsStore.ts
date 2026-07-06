// Preview/demo persistence for Art Department requests (no live DB).
// Lets submitted requests actually appear in My Requests / Queue / Department
// Workload so the team-workload view is testable. Backed by localStorage.
//
// SEED VERSION: `phv3:demo-requests` (bumped from phv2 for the Workload feature).
// The v3 seed is tuned so the Workload page tells its story at a glance:
//   • Jaclyn is clearly OVER capacity (~18.5 WLP all-open, ~14 this-week) with
//     several urgent/high full-briefs → vermilion band, bar crosses the line.
//   • Dan sits HEALTHY (~8.25 WLP, ~68% util) for contrast (jade).
//   • One genuinely unassigned open item (ART-1015) exercises the neutral bucket.
//   • request_type varies (easy / full_brief) so the type multiplier is visible.
//   • Due dates spread across overdue / this-week / next-week / far so the
//     This week / Next week / All open windows visibly differ.
// Bumping the key forces returning preview users to re-seed (loader re-seeds when
// the key is absent).
import type { ArtRequest, CreateRequestPayload, UpdateRequestPatch } from "@/types/request";

const KEY = "phv3:demo-requests";

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
  // A richer spread (departments, statuses, priorities, request types, assignees,
  // due dates, and submission dates across several weeks) so the Reports dashboard
  // and Team Workload render meaningful charts in preview. Per-item WLP is noted
  // inline (priority weight × type multiplier — see workloadMetrics.ts).
  return [
    // ── Jaclyn — deliberately OVER capacity (all-open ≈ 18.5 WLP) ──────────────
    base({ request_number: "ART-1001", title: "Kroger summer endcap refresh", description: "Endcap creative for summer promo.", request_type: "full_brief", priority: "urgent", status: "in_progress", requester_id: "mock-uid-001", department_id: "dept-art", assignee_id: "mock-uid-005", due_date: daysAhead(3), created_at: daysAgo(2), submitted_at: daysAgo(2), assigned_at: daysAgo(1), metadata: { customer: "Kroger", project_lead: "jaclyn", assigned_manager: "jaclyn" } }), // 4.5 · this wk
    base({ request_number: "ART-1003", title: "CVS Caring Mill label proof", description: "Label proof, overdue.", request_type: "full_brief", priority: "urgent", status: "assigned", requester_id: "mock-uid-003", department_id: "dept-art", assignee_id: "mock-uid-005", due_date: daysAgo(2), created_at: daysAgo(9), submitted_at: daysAgo(9), assigned_at: daysAgo(8), metadata: { customer: "CVS", project_lead: "jaclyn", assigned_manager: "jaclyn" } }), // 4.5 · overdue
    base({ request_number: "ART-1005", title: "Target holiday cap art", description: "Holiday endcap.", request_type: "full_brief", priority: "high", status: "in_progress", requester_id: "mock-uid-001", department_id: "dept-art", assignee_id: "mock-uid-005", due_date: daysAhead(1), created_at: daysAgo(13), submitted_at: daysAgo(13), assigned_at: daysAgo(12), metadata: { customer: "Target", project_lead: "jaclyn", assigned_manager: "jaclyn" } }), // 3.0 · this wk
    base({ request_number: "ART-1011", title: "Publix BOGO tags", description: "BOGO tags.", request_type: "easy", priority: "high", status: "submitted", requester_id: "mock-uid-004", department_id: "dept-art", due_date: daysAhead(4), created_at: daysAgo(1), submitted_at: daysAgo(1), metadata: { customer: "Publix", project_lead: "jaclyn", assigned_manager: "jaclyn" } }), // 2.0 · this wk
    base({ request_number: "ART-1007", title: "Sephora gift set sleeve", description: "Gift sleeve.", request_type: "easy", priority: "medium", status: "sent_for_approval", requester_id: "mock-uid-006", department_id: "dept-art", assignee_id: "mock-uid-005", due_date: daysAhead(9), created_at: daysAgo(15), submitted_at: daysAgo(15), assigned_at: daysAgo(14), metadata: { customer: "Sephora", project_lead: "jaclyn", assigned_manager: "jaclyn" } }), // 1.5 · next wk
    base({ request_number: "ART-1013", title: "Ulta endcap hero", description: "Endcap hero art.", request_type: "easy", priority: "urgent", status: "assigned", requester_id: "mock-uid-006", department_id: "dept-art", assignee_id: "mock-uid-005", due_date: daysAhead(8), created_at: daysAgo(3), submitted_at: daysAgo(3), assigned_at: daysAgo(2), metadata: { customer: "Ulta", project_lead: "jaclyn", assigned_manager: "jaclyn" } }), // 3.0 · next wk

    // ── Dan — HEALTHY for contrast (all-open ≈ 8.25 WLP, ~83% util) ───────────
    base({ request_number: "ART-1002", title: "Trojan promo banner set", description: "Banner set for Q3 promo.", request_type: "easy", priority: "medium", status: "in_progress", requester_id: "mock-uid-002", department_id: "dept-mkt", assignee_id: "mock-uid-003", due_date: daysAhead(2), created_at: daysAgo(6), submitted_at: daysAgo(6), assigned_at: daysAgo(5), metadata: { customer: "Trojan", project_lead: "dan", assigned_manager: "dan" } }), // 1.5 · this wk
    base({ request_number: "ART-1004", title: "Walgreens shelf talker", description: "Shelf talker set.", request_type: "easy", priority: "low", status: "in_review", requester_id: "mock-uid-004", department_id: "dept-mkt", due_date: daysAhead(3), created_at: daysAgo(11), submitted_at: daysAgo(11), metadata: { customer: "Walgreens", project_lead: "dan", assigned_manager: "dan" } }), // 1.0 · this wk
    base({ request_number: "ART-1008", title: "Amazon A+ content", description: "A+ modules.", request_type: "full_brief", priority: "medium", status: "waiting_on_info", requester_id: "mock-uid-004", department_id: "dept-mkt", assignee_id: "mock-uid-003", due_date: daysAhead(2), created_at: daysAgo(18), submitted_at: daysAgo(18), assigned_at: daysAgo(17), metadata: { customer: "Amazon", project_lead: "dan", assigned_manager: "dan" } }), // 2.25 · this wk
    base({ request_number: "ART-1010", title: "Whole Foods signage", description: "Store signage.", request_type: "easy", priority: "high", status: "internal_review", requester_id: "mock-uid-006", department_id: "dept-mkt", assignee_id: "mock-uid-003", due_date: daysAhead(3), created_at: daysAgo(8), submitted_at: daysAgo(8), assigned_at: daysAgo(7), metadata: { customer: "Whole Foods", project_lead: "dan", assigned_manager: "dan" } }), // 2.0 · this wk
    base({ request_number: "ART-1014", title: "Costco travel pack refresh", description: "Club travel pack.", request_type: "easy", priority: "medium", status: "submitted", requester_id: "mock-uid-002", department_id: "dept-mkt", assignee_id: "mock-uid-003", due_date: daysAhead(9), created_at: daysAgo(1), submitted_at: daysAgo(1), metadata: { customer: "Costco", project_lead: "dan", assigned_manager: "dan" } }), // 1.5 · next wk

    // ── Unassigned open item (no lead, no assignee) → neutral bucket ──────────
    base({ request_number: "ART-1015", title: "Rite Aid clearance signage", description: "Unrouted clearance signage.", request_type: "easy", priority: "urgent", status: "submitted", requester_id: "mock-uid-004", department_id: "dept-art", due_date: daysAhead(2), created_at: daysAgo(1), submitted_at: daysAgo(1), metadata: { customer: "Rite Aid" } }), // 3.0 · this wk · UNASSIGNED

    // ── Completed / archived — excluded from load; feed Reports throughput ────
    base({ request_number: "ART-1006", title: "Costco club pack mockup", description: "Club pack.", priority: "medium", status: "complete", requester_id: "mock-uid-002", department_id: "dept-mkt", assignee_id: "mock-uid-003", due_date: daysAgo(3), created_at: daysAgo(20), submitted_at: daysAgo(20), assigned_at: daysAgo(19), completed_at: daysAgo(4), metadata: { customer: "Costco", project_lead: "dan", assigned_manager: "dan" } }),
    base({ request_number: "ART-1009", title: "Dollar General planogram", description: "Planogram art.", priority: "low", status: "complete", requester_id: "mock-uid-001", department_id: "dept-art", assignee_id: "mock-uid-005", due_date: daysAgo(10), created_at: daysAgo(28), submitted_at: daysAgo(28), assigned_at: daysAgo(27), completed_at: daysAgo(12), metadata: { customer: "Dollar General", project_lead: "jaclyn", assigned_manager: "jaclyn" } }),
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
export function demoDeleteRequest(id: string): void {
  save(load().filter((r) => r.id !== id));
}

export function demoUpdateRequest(id: string, patch: UpdateRequestPatch): ArtRequest {
  const list = load();
  const i = list.findIndex((r) => r.id === id);
  if (i < 0) throw new Error("Request not found (demo)");
  list[i] = { ...list[i], ...patch, updated_at: now() } as ArtRequest;
  save(list);
  return list[i];
}
