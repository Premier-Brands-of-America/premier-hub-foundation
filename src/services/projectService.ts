import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import { isValidUrl } from "@/lib/validation";
import type {
  Project, ProjectStakeholder, ProjectUpdate, ProjectActivity,
  ProjectAttachment, ProjectLink, ProjectWithMeta, EnrichedStakeholder,
  StakeholderProfile,
} from "@/types/projects";
import type { PaginatedResult } from "@/services/taskService";

const IS_PREVIEW = isPreviewEnvironment();
export const PROJECT_PAGE_SIZE = 25;

const PROJECT_FIELDS = "id, title, status, visibility, owner_id, desired_due_date, updated_due_date, overall_percent_complete, created_at, completed_at, description, updated_at";

// ─── Mock data for preview ───
let mockProjects: Project[] = [];
let mockStakeholders: EnrichedStakeholder[] = [];
let mockUpdates: ProjectUpdate[] = [];
let mockActivity: ProjectActivity[] = [];
let mockAttachments: ProjectAttachment[] = [];
let mockLinks: ProjectLink[] = [];
let mockIdCounter = 1;
const mockId = () => `mock-proj-${mockIdCounter++}`;

// ─── Profile cache for display names ───
const profileCache = new Map<string, { full_name: string | null; email: string | null }>();

export async function resolveProfileName(userId: string): Promise<string> {
  if (IS_PREVIEW) {
    const s = mockStakeholders.find((s) => s.user_id === userId);
    return s?.full_name || "Unknown";
  }
  if (profileCache.has(userId)) {
    const cached = profileCache.get(userId)!;
    return cached.full_name || cached.email || userId.slice(0, 8);
  }
  const { data } = await supabase.from("profiles").select("full_name, email").eq("user_id", userId).single();
  if (data) {
    profileCache.set(userId, data);
    return data.full_name || data.email || userId.slice(0, 8);
  }
  return userId.slice(0, 8);
}

// ─── Projects ───

export async function fetchProjects(page = 0): Promise<PaginatedResult<ProjectWithMeta>> {
  if (IS_PREVIEW) {
    const items = mockProjects.map((p) => ({
      ...p,
      stakeholders: mockStakeholders.filter((s) => s.project_id === p.id),
    }));
    return { items, total: items.length, page, pageSize: PROJECT_PAGE_SIZE };
  }

  const from = page * PROJECT_PAGE_SIZE;
  const to = from + PROJECT_PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from("projects")
    .select(PROJECT_FIELDS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { items: (data ?? []) as ProjectWithMeta[], total: count || 0, page, pageSize: PROJECT_PAGE_SIZE };
}

export async function fetchProject(id: string): Promise<ProjectWithMeta | null> {
  if (IS_PREVIEW) {
    const p = mockProjects.find((p) => p.id === id);
    if (!p) return null;
    return { ...p, stakeholders: mockStakeholders.filter((s) => s.project_id === id) };
  }
  const { data, error } = await supabase.from("projects").select(PROJECT_FIELDS).eq("id", id).single();
  if (error) throw error;
  return data as ProjectWithMeta;
}

export async function createProject(
  userId: string,
  input: { title: string; description?: string; visibility?: "public" | "private"; desired_due_date?: string }
): Promise<Project> {
  if (IS_PREVIEW) {
    const now = new Date().toISOString();
    const proj: Project = {
      id: mockId(), owner_id: userId, title: input.title,
      description: input.description ?? null,
      visibility: input.visibility ?? "private",
      status: "active", desired_due_date: input.desired_due_date ?? null,
      updated_due_date: null, overall_percent_complete: null,
      completed_at: null, created_at: now, updated_at: now,
    };
    mockProjects.unshift(proj);
    mockStakeholders.push({
      id: mockId(), project_id: proj.id, user_id: userId,
      percent_complete: null, added_at: now, full_name: "You", email: "",
    });
    mockActivity.push({
      id: mockId(), project_id: proj.id, user_id: userId,
      action: "project_created", field_name: null, old_value: null, new_value: null, created_at: now,
    });
    return proj;
  }

  const { data, error } = await supabase.from("projects").insert({
    owner_id: userId, title: input.title,
    description: input.description || null,
    visibility: input.visibility || "private",
    desired_due_date: input.desired_due_date || null,
  }).select().single();
  if (error) throw error;

  await supabase.from("project_stakeholders").insert({ project_id: data.id, user_id: userId });
  await logProjectActivity(userId, data.id, "project_created");
  return data as Project;
}

export async function updateProject(
  userId: string, projectId: string,
  updates: Partial<Pick<Project, "title" | "description" | "visibility" | "status" | "desired_due_date" | "updated_due_date" | "overall_percent_complete" | "owner_id">>,
  oldProject: Project
): Promise<Project> {
  const changes: { field: string; old: string | null; new_: string | null }[] = [];

  const trackChange = (field: string, oldVal: unknown, newVal: unknown) => {
    if (newVal !== undefined && String(newVal ?? "") !== String(oldVal ?? ""))
      changes.push({ field, old: oldVal === null ? null : String(oldVal), new_: newVal === null ? null : String(newVal) });
  };

  trackChange("title", oldProject.title, updates.title);
  trackChange("description", oldProject.description, updates.description);
  trackChange("visibility", oldProject.visibility, updates.visibility);
  trackChange("desired_due_date", oldProject.desired_due_date, updates.desired_due_date);
  trackChange("updated_due_date", oldProject.updated_due_date, updates.updated_due_date);
  trackChange("overall_percent_complete",
    oldProject.overall_percent_complete === null ? "N/A" : oldProject.overall_percent_complete,
    updates.overall_percent_complete === null ? "N/A" : updates.overall_percent_complete);
  if (updates.owner_id && updates.owner_id !== oldProject.owner_id)
    changes.push({ field: "owner", old: oldProject.owner_id, new_: updates.owner_id });

  const dbUpdates: {
    title?: string; description?: string | null; visibility?: string; status?: string;
    desired_due_date?: string | null; updated_due_date?: string | null;
    overall_percent_complete?: number | null; owner_id?: string; completed_at?: string | null;
  } = { ...updates };

  if (updates.status === "complete" && oldProject.status !== "complete") {
    dbUpdates.completed_at = new Date().toISOString();
    changes.push({ field: "status", old: "active", new_: "complete" });
  } else if (updates.status === "active" && oldProject.status !== "active") {
    dbUpdates.completed_at = null;
    changes.push({ field: "status", old: "complete", new_: "active" });
  }

  if (IS_PREVIEW) {
    const idx = mockProjects.findIndex((p) => p.id === projectId);
    if (idx >= 0) {
      mockProjects[idx] = { ...mockProjects[idx], ...dbUpdates, updated_at: new Date().toISOString() } as Project;
      for (const c of changes) {
        mockActivity.push({
          id: mockId(), project_id: projectId, user_id: userId,
          action: c.field === "status" ? (c.new_ === "complete" ? "project_completed" : "project_reopened") : "field_changed",
          field_name: c.field, old_value: c.old, new_value: c.new_, created_at: new Date().toISOString(),
        });
      }
      return mockProjects[idx];
    }
    throw new Error("Project not found");
  }

  const { data, error } = await supabase.from("projects").update(dbUpdates).eq("id", projectId).select().single();
  if (error) throw error;

  for (const c of changes) {
    const action = c.field === "status"
      ? (c.new_ === "complete" ? "project_completed" : "project_reopened")
      : c.field === "owner" ? "ownership_changed" : "field_changed";
    await logProjectActivity(userId, projectId, action, c.field, c.old, c.new_);
  }
  return data as Project;
}

// ─── Batch Stakeholders (avoids N+1) ───

export async function fetchStakeholdersForProjects(projectIds: string[]): Promise<Record<string, EnrichedStakeholder[]>> {
  if (IS_PREVIEW) {
    const result: Record<string, EnrichedStakeholder[]> = {};
    for (const id of projectIds) {
      result[id] = mockStakeholders.filter(s => s.project_id === id);
    }
    return result;
  }

  const grouped: Record<string, EnrichedStakeholder[]> = {};
  for (const id of projectIds) grouped[id] = [];
  if (projectIds.length === 0) return grouped;

  const { data, error } = await supabase
    .from("project_stakeholders")
    .select("id, project_id, user_id, percent_complete, added_at")
    .in("project_id", projectIds);
  if (error) throw error;

  const userIds = [...new Set((data || []).map(s => s.user_id))];
  const profiles = userIds.length > 0
    ? (await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds)).data || []
    : [];
  const profileMap = new Map(profiles.map(p => [p.user_id, p]));

  for (const s of data || []) {
    const profile = profileMap.get(s.user_id);
    grouped[s.project_id].push({
      ...s, full_name: profile?.full_name || null, email: profile?.email || null,
    });
  }
  return grouped;
}

// ─── Stakeholders ───

export async function fetchProjectStakeholders(projectId: string): Promise<EnrichedStakeholder[]> {
  if (IS_PREVIEW) return mockStakeholders.filter((s) => s.project_id === projectId);
  const { data, error } = await supabase
    .from("project_stakeholders").select("id, project_id, user_id, percent_complete, added_at")
    .eq("project_id", projectId);
  if (error) throw error;

  const stakeholders = (data ?? []) as ProjectStakeholder[];
  const userIds = stakeholders.map((s) => s.user_id);
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, title, department, manager_email")
      .in("user_id", userIds);
    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    return stakeholders.map((s) => ({
      ...s,
      full_name: profileMap.get(s.user_id)?.full_name ?? null,
      email: profileMap.get(s.user_id)?.email ?? null,
      title: profileMap.get(s.user_id)?.title ?? null,
      department: profileMap.get(s.user_id)?.department ?? null,
      manager_email: profileMap.get(s.user_id)?.manager_email ?? null,
    }));
  }
  return stakeholders.map((s) => ({ ...s, full_name: null, email: null, title: null, department: null, manager_email: null }));
}

export async function addProjectStakeholder(
  userId: string, projectId: string, stakeholderProfile: StakeholderProfile
): Promise<void> {
  const name = stakeholderProfile.full_name || stakeholderProfile.email || stakeholderProfile.user_id;
  if (IS_PREVIEW) {
    mockStakeholders.push({
      id: mockId(), project_id: projectId, user_id: stakeholderProfile.user_id,
      percent_complete: null, added_at: new Date().toISOString(),
      full_name: stakeholderProfile.full_name, email: stakeholderProfile.email,
      title: stakeholderProfile.title, department: stakeholderProfile.department,
      manager_email: stakeholderProfile.manager_email,
    });
    await logProjectActivity(userId, projectId, "stakeholder_added", "stakeholder", null, name);
    return;
  }
  const { error } = await supabase.from("project_stakeholders").insert({
    project_id: projectId, user_id: stakeholderProfile.user_id,
  });
  if (error) throw error;
  await logProjectActivity(userId, projectId, "stakeholder_added", "stakeholder", null, name);
}

export async function removeProjectStakeholder(userId: string, projectId: string, stakeholderId: string, name?: string): Promise<void> {
  if (IS_PREVIEW) {
    mockStakeholders = mockStakeholders.filter((s) => s.id !== stakeholderId);
    await logProjectActivity(userId, projectId, "stakeholder_removed", "stakeholder", name ?? null, null);
    return;
  }
  const { error } = await supabase.from("project_stakeholders").delete().eq("id", stakeholderId);
  if (error) throw error;
  await logProjectActivity(userId, projectId, "stakeholder_removed", "stakeholder", name ?? null, null);
}

export async function updateStakeholderPercent(_userId: string, _projectId: string, stakeholderId: string, percent: number | null): Promise<void> {
  if (IS_PREVIEW) {
    const s = mockStakeholders.find((s) => s.id === stakeholderId);
    if (s) s.percent_complete = percent;
    return;
  }
  const { error } = await supabase.from("project_stakeholders").update({ percent_complete: percent }).eq("id", stakeholderId);
  if (error) throw error;
}

// ─── Activity ───

async function logProjectActivity(
  userId: string, projectId: string, action: string,
  fieldName?: string, oldValue?: string | null, newValue?: string | null
) {
  if (IS_PREVIEW) {
    mockActivity.push({
      id: mockId(), project_id: projectId, user_id: userId,
      action, field_name: fieldName ?? null,
      old_value: oldValue ?? null, new_value: newValue ?? null,
      created_at: new Date().toISOString(),
    });
    return;
  }
  await supabase.from("project_activity").insert({
    user_id: userId, project_id: projectId, action,
    field_name: fieldName || null, old_value: oldValue ?? null, new_value: newValue ?? null,
  });
}

export async function fetchProjectActivity(projectId: string): Promise<ProjectActivity[]> {
  if (IS_PREVIEW) return mockActivity.filter((a) => a.project_id === projectId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const { data, error } = await supabase
    .from("project_activity").select("id, project_id, user_id, action, field_name, old_value, new_value, created_at")
    .eq("project_id", projectId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProjectActivity[];
}

// ─── Updates ───

export async function fetchProjectUpdates(projectId: string): Promise<ProjectUpdate[]> {
  if (IS_PREVIEW) return mockUpdates.filter((u) => u.project_id === projectId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const { data, error } = await supabase
    .from("project_updates").select("id, project_id, user_id, content, created_at, updated_at, edited_by")
    .eq("project_id", projectId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProjectUpdate[];
}

export async function addProjectUpdate(userId: string, projectId: string, content: string): Promise<ProjectUpdate> {
  if (IS_PREVIEW) {
    const now = new Date().toISOString();
    const u: ProjectUpdate = { id: mockId(), project_id: projectId, user_id: userId, content, created_at: now, updated_at: now, edited_by: null };
    mockUpdates.push(u);
    await logProjectActivity(userId, projectId, "update_added");
    return u;
  }
  const { data, error } = await supabase.from("project_updates").insert({ user_id: userId, project_id: projectId, content }).select().single();
  if (error) throw error;
  await logProjectActivity(userId, projectId, "update_added");
  return data as ProjectUpdate;
}

export async function editProjectUpdate(userId: string, projectId: string, updateId: string, content: string): Promise<ProjectUpdate> {
  if (IS_PREVIEW) {
    const u = mockUpdates.find((u) => u.id === updateId);
    if (u) {
      u.content = content;
      u.updated_at = new Date().toISOString();
      u.edited_by = userId;
    }
    await logProjectActivity(userId, projectId, "update_edited");
    return u!;
  }
  const { data, error } = await supabase.from("project_updates")
    .update({ content, edited_by: userId })
    .eq("id", updateId)
    .select().single();
  if (error) throw error;
  await logProjectActivity(userId, projectId, "update_edited");
  return data as ProjectUpdate;
}

// ─── Attachments ───

export async function fetchProjectAttachments(projectId: string): Promise<ProjectAttachment[]> {
  if (IS_PREVIEW) return mockAttachments.filter((a) => a.project_id === projectId);
  const { data, error } = await supabase
    .from("project_attachments").select("id, project_id, user_id, file_name, file_size, file_type, storage_path, created_at")
    .eq("project_id", projectId);
  if (error) throw error;
  return (data ?? []) as ProjectAttachment[];
}

export async function uploadProjectAttachment(userId: string, projectId: string, file: File): Promise<ProjectAttachment> {
  if (IS_PREVIEW) {
    const a: ProjectAttachment = {
      id: mockId(), project_id: projectId, user_id: userId,
      file_name: file.name, file_size: file.size, file_type: file.type,
      storage_path: `preview/${file.name}`, created_at: new Date().toISOString(),
    };
    mockAttachments.push(a);
    await logProjectActivity(userId, projectId, "attachment_added", "attachment", null, file.name);
    return a;
  }
  const path = `${projectId}/${Date.now()}_${file.name}`;
  const { error: upErr } = await supabase.storage.from("project-attachments").upload(path, file);
  if (upErr) throw upErr;
  const { data, error } = await supabase.from("project_attachments").insert({
    user_id: userId, project_id: projectId,
    file_name: file.name, file_size: file.size, file_type: file.type, storage_path: path,
  }).select().single();
  if (error) throw error;
  await logProjectActivity(userId, projectId, "attachment_added", "attachment", null, file.name);
  return data as ProjectAttachment;
}

export async function removeProjectAttachment(userId: string, projectId: string, att: ProjectAttachment): Promise<void> {
  if (IS_PREVIEW) {
    mockAttachments = mockAttachments.filter((a) => a.id !== att.id);
    await logProjectActivity(userId, projectId, "attachment_removed", "attachment", att.file_name, null);
    return;
  }
  await supabase.storage.from("project-attachments").remove([att.storage_path]);
  await supabase.from("project_attachments").delete().eq("id", att.id);
  await logProjectActivity(userId, projectId, "attachment_removed", "attachment", att.file_name, null);
}

export async function getProjectAttachmentSignedUrl(storagePath: string): Promise<string> {
  if (IS_PREVIEW) return "#";
  const { data, error } = await supabase.storage.from("project-attachments").createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// ─── Links ───

export async function fetchProjectLinks(projectId: string): Promise<ProjectLink[]> {
  if (IS_PREVIEW) return mockLinks.filter((l) => l.project_id === projectId);
  const { data, error } = await supabase
    .from("project_links").select("id, project_id, user_id, url, label, created_at")
    .eq("project_id", projectId);
  if (error) throw error;
  return (data ?? []) as ProjectLink[];
}

export async function addProjectLink(userId: string, projectId: string, url: string, label?: string): Promise<ProjectLink> {
  if (!isValidUrl(url)) {
    throw new Error("Please enter a valid URL (e.g., https://example.com)");
  }
  if (IS_PREVIEW) {
    const l: ProjectLink = { id: mockId(), project_id: projectId, user_id: userId, url, label: label ?? null, created_at: new Date().toISOString() };
    mockLinks.push(l);
    await logProjectActivity(userId, projectId, "link_added", "link", null, label || url);
    return l;
  }
  const { data, error } = await supabase.from("project_links").insert({ user_id: userId, project_id: projectId, url, label: label || null }).select().single();
  if (error) throw error;
  await logProjectActivity(userId, projectId, "link_added", "link", null, label || url);
  return data as ProjectLink;
}

export async function removeProjectLink(userId: string, projectId: string, linkId: string, linkLabel?: string): Promise<void> {
  if (IS_PREVIEW) {
    mockLinks = mockLinks.filter((l) => l.id !== linkId);
    await logProjectActivity(userId, projectId, "link_removed", "link", linkLabel ?? null, null);
    return;
  }
  await supabase.from("project_links").delete().eq("id", linkId);
  await logProjectActivity(userId, projectId, "link_removed", "link", linkLabel ?? null, null);
}
