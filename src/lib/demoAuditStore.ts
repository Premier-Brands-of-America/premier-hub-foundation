// Preview/demo audit feed for the APP-WIDE Audit Log (no live DB in preview).
// Spans every area of the hub — projects, tasks, pages, art requests, auth, and
// admin actions — so the Audit Log renders a realistic cross-app history.
// Actors reuse the preview directory identities (see src/lib/directory.ts).

export type AuditArea = "project" | "task" | "page" | "request" | "auth" | "admin";

export interface AuditEntry {
  id: string;
  /** ISO timestamp; the feed is returned newest-first. */
  created_at: string;
  actor_id: string;
  actor_name: string;
  actor_email: string;
  area: AuditArea;
  /** Machine-ish action key, used by the action-type filter. */
  action_kind: string;
  /** Human-readable action label. */
  action: string;
  /** Target entity kind, e.g. "Art Request", "Task", "Feature Flag". */
  entity_type: string;
  /** Target entity title / number. */
  entity_label: string;
  /** Optional extra context (old → new value, etc.). */
  detail?: string;
}

interface Actor {
  id: string;
  name: string;
  email: string;
}

const ACTORS: Record<string, Actor> = {
  jane: { id: "mock-uid-001", name: "Jane Doe", email: "jane.doe@premier-brands.com" },
  alex: { id: "mock-uid-002", name: "Alex Admin", email: "admin@premier-brands.com" },
  dana: { id: "mock-uid-003", name: "Dana Diagnostics", email: "diag.user@premier-brands.com" },
  sam: { id: "mock-uid-004", name: "Sam Smith", email: "sam.smith@premier-brands.com" },
  casey: { id: "mock-uid-005", name: "Casey Chen", email: "casey.chen@premier-brands.com" },
  riley: { id: "mock-uid-006", name: "Riley Roberts", email: "riley.roberts@premier-brands.com" },
};

function minutesAgo(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}

interface SeedRow {
  actor: Actor;
  area: AuditArea;
  action_kind: string;
  action: string;
  entity_type: string;
  entity_label: string;
  detail?: string;
  min: number; // minutes ago
}

// Ordered roughly newest-first; we sort defensively below.
const SEED: SeedRow[] = [
  { actor: ACTORS.alex, area: "admin", action_kind: "feature_flag.toggled", action: "Enabled feature flag", entity_type: "Feature Flag", entity_label: "reports", detail: "off → on (global)", min: 6 },
  { actor: ACTORS.sam, area: "request", action_kind: "request.submitted", action: "Submitted request", entity_type: "Art Request", entity_label: "ART-1042 · Kroger summer endcap", min: 18 },
  { actor: ACTORS.casey, area: "task", action_kind: "task.completed", action: "Completed task", entity_type: "Task", entity_label: "Wire up SharePoint provisioning", min: 41 },
  { actor: ACTORS.jane, area: "page", action_kind: "page.shared", action: "Shared page", entity_type: "Page", entity_label: "Q3 Campaign Brief", detail: "with Marketing (view)", min: 67 },
  { actor: ACTORS.alex, area: "admin", action_kind: "role.changed", action: "Changed role", entity_type: "Role", entity_label: "Riley Roberts", detail: "requester → designer", min: 95 },
  { actor: ACTORS.dana, area: "auth", action_kind: "auth.login", action: "Signed in", entity_type: "User", entity_label: "Dana Diagnostics", detail: "Microsoft SSO", min: 120 },
  { actor: ACTORS.jane, area: "request", action_kind: "request.assigned", action: "Assigned request", entity_type: "Art Request", entity_label: "ART-1003 · CVS Caring Mill label", detail: "→ Casey Chen", min: 148 },
  { actor: ACTORS.casey, area: "project", action_kind: "project.created", action: "Created project", entity_type: "Project", entity_label: "Trojan Q3 Promo", min: 175 },
  { actor: ACTORS.alex, area: "admin", action_kind: "department.added", action: "Added department", entity_type: "Department", entity_label: "Packaging Design", min: 210 },
  { actor: ACTORS.sam, area: "request", action_kind: "request.status_changed", action: "Changed request status", entity_type: "Art Request", entity_label: "ART-1002 · Trojan promo banner set", detail: "assigned → in progress", min: 240 },
  { actor: ACTORS.riley, area: "task", action_kind: "task.created", action: "Created task", entity_type: "Task", entity_label: "Draft endcap layout v1", min: 305 },
  { actor: ACTORS.jane, area: "page", action_kind: "page.edited", action: "Edited page", entity_type: "Page", entity_label: "Brand Guidelines 2026", min: 366 },
  { actor: ACTORS.casey, area: "auth", action_kind: "auth.login", action: "Signed in", entity_type: "User", entity_label: "Casey Chen", detail: "Microsoft SSO", min: 430 },
  { actor: ACTORS.alex, area: "admin", action_kind: "feature_flag.toggled", action: "Disabled feature flag", entity_type: "Feature Flag", entity_label: "sharepoint_integration", detail: "on → off (global)", min: 520 },
  { actor: ACTORS.sam, area: "project", action_kind: "project.updated", action: "Updated project", entity_type: "Project", entity_label: "Kroger Summer Refresh", detail: "due date moved +1w", min: 610 },
  { actor: ACTORS.riley, area: "request", action_kind: "request.submitted", action: "Submitted request", entity_type: "Art Request", entity_label: "ART-1041 · Walgreens shelf talker", min: 700 },
  { actor: ACTORS.dana, area: "task", action_kind: "task.completed", action: "Completed task", entity_type: "Task", entity_label: "QA pass on label proofs", min: 900 },
  { actor: ACTORS.jane, area: "page", action_kind: "page.created", action: "Created page", entity_type: "Page", entity_label: "Q3 Campaign Brief", min: 1100 },
  { actor: ACTORS.alex, area: "admin", action_kind: "permission.granted", action: "Granted diagnostics access", entity_type: "User", entity_label: "Dana Diagnostics", min: 1500 },
  { actor: ACTORS.casey, area: "project", action_kind: "project.completed", action: "Completed project", entity_type: "Project", entity_label: "Spring Refresh 2026", min: 2000 },
  { actor: ACTORS.sam, area: "auth", action_kind: "auth.login", action: "Signed in", entity_type: "User", entity_label: "Sam Smith", detail: "Microsoft SSO", min: 2600 },
  { actor: ACTORS.riley, area: "request", action_kind: "request.status_changed", action: "Changed request status", entity_type: "Art Request", entity_label: "ART-1001 · Kroger summer endcap", detail: "in progress → complete", min: 3200 },
];

/** Returns the demo audit feed, newest-first. */
export function demoListAudit(): AuditEntry[] {
  return SEED.map((r, i) => ({
    id: "demo-audit-" + i,
    created_at: minutesAgo(r.min),
    actor_id: r.actor.id,
    actor_name: r.actor.name,
    actor_email: r.actor.email,
    area: r.area,
    action_kind: r.action_kind,
    action: r.action,
    entity_type: r.entity_type,
    entity_label: r.entity_label,
    detail: r.detail,
  })).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export const AUDIT_AREAS: AuditArea[] = ["project", "task", "page", "request", "auth", "admin"];

export const AREA_LABEL: Record<AuditArea, string> = {
  project: "Projects",
  task: "Tasks",
  page: "Pages",
  request: "Art Requests",
  auth: "Auth",
  admin: "Admin",
};
