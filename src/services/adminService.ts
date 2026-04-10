import { supabase } from "@/integrations/supabase/client";

export interface EmployeeProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  title: string | null;
  department: string | null;
  manager_email: string | null;
  is_admin: boolean;
  can_view_diagnostics: boolean;
  is_active: boolean;
}

export async function fetchAllProfiles(): Promise<EmployeeProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, user_id, email, full_name, title, department, manager_email, is_admin, can_view_diagnostics, is_active")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data || []) as EmployeeProfile[];
}

export async function updateProfileFlag(
  userId: string,
  flag: "is_admin" | "can_view_diagnostics" | "is_active",
  value: boolean
) {
  const updates: Record<string, boolean | string> = {
    updated_at: new Date().toISOString(),
  };
  updates[flag] = value;

  const { error } = await supabase
    .from("profiles")
    .update(updates as any)
    .eq("user_id", userId);

  if (error) throw error;
}

export interface DiagnosticsRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  department: string | null;
  active_owned: number;
  active_assigned: number;
  total_active: number;
  completed: number;
}

export async function fetchDiagnosticsData(filters: {
  includeCompleted: boolean;
  publicOnly: boolean;
}): Promise<DiagnosticsRow[]> {
  // Fetch all profiles
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("user_id, full_name, email, department")
    .eq("is_active", true)
    .order("full_name", { ascending: true });
  if (pErr) throw pErr;

  // Fetch projects
  let projectQuery = supabase
    .from("projects")
    .select("id, owner_id, status, visibility");

  if (filters.publicOnly) {
    projectQuery = projectQuery.eq("visibility", "public");
  }

  const { data: projects, error: prErr } = await projectQuery;
  if (prErr) throw prErr;

  // Fetch all stakeholder assignments
  const { data: stakeholders, error: sErr } = await supabase
    .from("project_stakeholders")
    .select("project_id, user_id");
  if (sErr) throw sErr;

  const projectList = projects || [];
  const stakeholderList = stakeholders || [];

  // Build per-user stats
  const rows: DiagnosticsRow[] = (profiles || []).map((p) => {
    const uid = p.user_id;

    const activeOwned = projectList.filter(
      (pr) => pr.owner_id === uid && pr.status === "active"
    );
    // Assigned = stakeholder but NOT owner
    const activeAssigned = projectList.filter(
      (pr) =>
        pr.status === "active" &&
        pr.owner_id !== uid &&
        stakeholderList.some((s) => s.project_id === pr.id && s.user_id === uid)
    );
    // Total active = deduplicated (owned OR assigned-as-stakeholder)
    const totalActiveIds = new Set<string>();
    activeOwned.forEach((pr) => totalActiveIds.add(pr.id));
    activeAssigned.forEach((pr) => totalActiveIds.add(pr.id));
    // Also include projects where user is both owner and stakeholder (already in activeOwned)

    // Additionally check: user could be stakeholder on a project they own — already counted via activeOwned
    // Also check projects where user is a stakeholder AND owner — don't double count
    const allActiveForUser = projectList.filter(
      (pr) =>
        pr.status === "active" &&
        (pr.owner_id === uid ||
          stakeholderList.some((s) => s.project_id === pr.id && s.user_id === uid))
    );
    const dedupedActive = new Set(allActiveForUser.map((pr) => pr.id));

    const completedProjects = projectList.filter(
      (pr) =>
        pr.status === "complete" &&
        (pr.owner_id === uid ||
          stakeholderList.some((s) => s.project_id === pr.id && s.user_id === uid))
    );
    const dedupedCompleted = new Set(completedProjects.map((pr) => pr.id));

    return {
      user_id: uid,
      full_name: p.full_name,
      email: p.email,
      department: p.department,
      active_owned: activeOwned.length,
      active_assigned: activeAssigned.length,
      total_active: dedupedActive.size,
      completed: dedupedCompleted.size,
    };
  });

  if (!filters.includeCompleted) {
    // Still show the column but only show employees who have active projects
    // Actually, the filter is about project inclusion, not employee filtering.
    // "active only vs include completed" means whether completed projects column is relevant.
    // Per requirements: completed column should be visible by default, so we always return it.
  }

  return rows;
}
