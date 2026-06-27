/**
 * Preview-only ACL demo dataset (Feature 5).
 *
 * Seeds a small set of projects/tasks/pages that demonstrates every visibility
 * rule relative to whoever is signed in as the mock viewer. A synthetic direct
 * report ("Riley Cho") always reports to the current viewer, so the
 * manager-of-report rule is observable: switch between the Standard and Admin
 * mock users and the visible set changes.
 */

import type { Project, EnrichedStakeholder } from "@/types/projects";
import type { Task } from "@/types/tasks";
import { getPreviewViewer } from "@/lib/previewViewer";
import type { VisibilityViewer } from "@/lib/visibility";

export interface DemoPerson {
  user_id: string;
  full_name: string;
  email: string;
}

/** A peer the viewer has no relationship with — used for "hidden" + "public" items. */
export const DEMO_OTHER: DemoPerson = {
  user_id: "demo-user-other",
  full_name: "Morgan Vendel",
  email: "morgan.vendel@premier-brands.com",
};

/** A direct report of the current viewer — used for the manager-of-report rule. */
export const DEMO_REPORT: DemoPerson = {
  user_id: "demo-user-report",
  full_name: "Riley Cho",
  email: "riley.cho@premier-brands.com",
};

/** Direct reports of the current viewer in the demo (Riley always reports up). */
export function demoDirectReportIds(): string[] {
  return [DEMO_REPORT.user_id];
}

/** Build a VisibilityViewer from the persisted preview viewer (or null if signed out). */
export function currentDemoViewer(): VisibilityViewer | null {
  const v = getPreviewViewer();
  if (!v) return null;
  return {
    userId: v.userId,
    isAdmin: v.isAdmin,
    departmentId: v.departmentId,
    directReportIds: demoDirectReportIds(),
  };
}

const now = () => new Date().toISOString();

function project(
  id: string,
  owner: string,
  title: string,
  visibility: "public" | "private",
  description: string,
): Project {
  const ts = now();
  return {
    id,
    owner_id: owner,
    title,
    description,
    visibility,
    status: "active",
    desired_due_date: null,
    updated_due_date: null,
    overall_percent_complete: null,
    completed_at: null,
    created_at: ts,
    updated_at: ts,
  };
}

function stakeholder(projectId: string, p: DemoPerson | { user_id: string; full_name: string; email: string }): EnrichedStakeholder {
  return {
    id: `demo-sh-${projectId}-${p.user_id}`,
    project_id: projectId,
    user_id: p.user_id,
    percent_complete: null,
    added_at: now(),
    full_name: p.full_name,
    email: p.email,
  };
}

/**
 * Demo projects + stakeholders for a viewer. Returns ALL of them (unfiltered);
 * the service applies canViewProjectRow so the demo shows the ACL working.
 */
export function buildDemoProjects(viewer: { userId: string; full_name?: string; email?: string }): {
  projects: Project[];
  stakeholders: EnrichedStakeholder[];
} {
  const me: DemoPerson = {
    user_id: viewer.userId,
    full_name: viewer.full_name || "You",
    email: viewer.email || "you@premier-brands.com",
  };

  const projects: Project[] = [
    project("demo-acl-p1", me.user_id, "My launch plan", "private", "Private to you — you are the owner."),
    project("demo-acl-p2", DEMO_OTHER.user_id, "Brand guidelines (public)", "public", "Public — visible to everyone."),
    project("demo-acl-p3", DEMO_OTHER.user_id, "Vendor contract (private)", "private", "Private to Morgan — hidden from you (visible to admins only)."),
    project("demo-acl-p4", DEMO_REPORT.user_id, "Riley's campaign draft", "private", "Private to Riley, your direct report — visible to you as their manager."),
    project("demo-acl-p5", DEMO_OTHER.user_id, "Cross-team rollout (shared)", "private", "Private, but you are a stakeholder."),
  ];

  const stakeholders: EnrichedStakeholder[] = [
    stakeholder("demo-acl-p1", me),
    stakeholder("demo-acl-p2", DEMO_OTHER),
    stakeholder("demo-acl-p3", DEMO_OTHER),
    stakeholder("demo-acl-p4", DEMO_REPORT),
    stakeholder("demo-acl-p5", DEMO_OTHER),
    stakeholder("demo-acl-p5", me), // viewer is a stakeholder here
  ];

  return { projects, stakeholders };
}

function task(id: string, owner: string, title: string, visibility: "public" | "private"): Task {
  const ts = now();
  return {
    id,
    user_id: owner,
    title,
    description: null,
    visibility,
    due_date: null,
    percent_complete: null,
    status: "active",
    completed_at: null,
    created_at: ts,
    updated_at: ts,
  };
}

/** Demo tasks (unfiltered) demonstrating owner / public / hidden / manager-of-report. */
export function buildDemoTasks(viewer: { userId: string }): Task[] {
  return [
    task("demo-acl-t1", viewer.userId, "Finish the deck", "private"),
    task("demo-acl-t2", DEMO_OTHER.user_id, "All-hands agenda (public)", "public"),
    task("demo-acl-t3", DEMO_OTHER.user_id, "Morgan's 1:1 notes (private)", "private"),
    task("demo-acl-t4", DEMO_REPORT.user_id, "Riley: export final assets", "private"),
  ];
}
