import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import type { Task, TaskContact, TaskUpdate, TaskActivity, TaskAttachment, TaskLink } from "@/types/tasks";

const IS_PREVIEW = isPreviewEnvironment();

// ─── Mock data for preview mode ───
let mockTasks: Task[] = [];
let mockContacts: TaskContact[] = [];
let mockUpdates: TaskUpdate[] = [];
let mockActivity: TaskActivity[] = [];
let mockAttachments: TaskAttachment[] = [];
let mockLinks: TaskLink[] = [];
let mockIdCounter = 1;
const mockId = () => `mock-task-${mockIdCounter++}`;

// ─── Tasks ───

export async function fetchTasks(): Promise<Task[]> {
  if (IS_PREVIEW) return [...mockTasks];
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function fetchTask(id: string): Promise<Task | null> {
  if (IS_PREVIEW) return mockTasks.find((t) => t.id === id) ?? null;
  const { data, error } = await supabase.from("tasks").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Task;
}

export async function createTask(
  userId: string,
  input: { title: string; description?: string; due_date?: string; percent_complete?: number | null }
): Promise<Task> {
  if (IS_PREVIEW) {
    const now = new Date().toISOString();
    const task: Task = {
      id: mockId(),
      user_id: userId,
      title: input.title,
      description: input.description ?? null,
      due_date: input.due_date ?? null,
      percent_complete: input.percent_complete ?? null,
      status: "active",
      completed_at: null,
      created_at: now,
      updated_at: now,
    };
    mockTasks.unshift(task);
    mockActivity.push({
      id: mockId(), task_id: task.id, user_id: userId,
      action: "task_created", field_name: null, old_value: null, new_value: null,
      created_at: now,
    });
    return task;
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description || null,
      due_date: input.due_date || null,
      percent_complete: input.percent_complete ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  await logActivity(userId, data.id, "task_created");
  return data as Task;
}

export async function updateTask(
  userId: string,
  taskId: string,
  updates: Partial<Pick<Task, "title" | "description" | "due_date" | "percent_complete" | "status">>,
  oldTask: Task
): Promise<Task> {
  const changes: { field: string; old: string | null; new_: string | null }[] = [];

  if (updates.title !== undefined && updates.title !== oldTask.title)
    changes.push({ field: "title", old: oldTask.title, new_: updates.title });
  if (updates.description !== undefined && updates.description !== oldTask.description)
    changes.push({ field: "description", old: oldTask.description, new_: updates.description ?? null });
  if (updates.due_date !== undefined && updates.due_date !== oldTask.due_date)
    changes.push({ field: "due_date", old: oldTask.due_date, new_: updates.due_date ?? null });
  if (updates.percent_complete !== undefined && updates.percent_complete !== oldTask.percent_complete)
    changes.push({
      field: "percent_complete",
      old: oldTask.percent_complete === null ? "N/A" : String(oldTask.percent_complete),
      new_: updates.percent_complete === null ? "N/A" : String(updates.percent_complete),
    });

  const dbUpdates: Record<string, any> = { ...updates };
  if (updates.status === "complete" && oldTask.status !== "complete") {
    dbUpdates.completed_at = new Date().toISOString();
    changes.push({ field: "status", old: "active", new_: "complete" });
  } else if (updates.status === "active" && oldTask.status !== "active") {
    dbUpdates.completed_at = null;
    changes.push({ field: "status", old: "complete", new_: "active" });
  }

  if (IS_PREVIEW) {
    const idx = mockTasks.findIndex((t) => t.id === taskId);
    if (idx >= 0) {
      mockTasks[idx] = { ...mockTasks[idx], ...dbUpdates, updated_at: new Date().toISOString() };
      for (const c of changes) {
        mockActivity.push({
          id: mockId(), task_id: taskId, user_id: userId,
          action: c.field === "status" ? (c.new_ === "complete" ? "task_completed" : "task_reopened") : "field_changed",
          field_name: c.field, old_value: c.old, new_value: c.new_,
          created_at: new Date().toISOString(),
        });
      }
      return mockTasks[idx];
    }
    throw new Error("Task not found");
  }

  const { data, error } = await supabase.from("tasks").update(dbUpdates).eq("id", taskId).select().single();
  if (error) throw error;

  for (const c of changes) {
    const action = c.field === "status"
      ? (c.new_ === "complete" ? "task_completed" : "task_reopened")
      : "field_changed";
    await logActivity(userId, taskId, action, c.field, c.old, c.new_);
  }

  return data as Task;
}

export async function deleteTask(taskId: string): Promise<void> {
  if (IS_PREVIEW) {
    mockTasks = mockTasks.filter((t) => t.id !== taskId);
    mockContacts = mockContacts.filter((c) => c.task_id !== taskId);
    mockUpdates = mockUpdates.filter((u) => u.task_id !== taskId);
    mockActivity = mockActivity.filter((a) => a.task_id !== taskId);
    mockAttachments = mockAttachments.filter((a) => a.task_id !== taskId);
    mockLinks = mockLinks.filter((l) => l.task_id !== taskId);
    return;
  }
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

// ─── Activity ───

async function logActivity(
  userId: string, taskId: string, action: string,
  fieldName?: string, oldValue?: string | null, newValue?: string | null
) {
  if (IS_PREVIEW) {
    mockActivity.push({
      id: mockId(), task_id: taskId, user_id: userId,
      action, field_name: fieldName ?? null,
      old_value: oldValue ?? null, new_value: newValue ?? null,
      created_at: new Date().toISOString(),
    });
    return;
  }
  await supabase.from("task_activity").insert({
    user_id: userId, task_id: taskId, action,
    field_name: fieldName || null, old_value: oldValue ?? null, new_value: newValue ?? null,
  });
}

export async function fetchTaskActivity(taskId: string): Promise<TaskActivity[]> {
  if (IS_PREVIEW) return mockActivity.filter((a) => a.task_id === taskId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const { data, error } = await supabase
    .from("task_activity").select("*").eq("task_id", taskId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TaskActivity[];
}

// ─── Updates ───

export async function fetchTaskUpdates(taskId: string): Promise<TaskUpdate[]> {
  if (IS_PREVIEW) return mockUpdates.filter((u) => u.task_id === taskId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const { data, error } = await supabase
    .from("task_updates").select("*").eq("task_id", taskId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TaskUpdate[];
}

export async function addTaskUpdate(userId: string, taskId: string, content: string): Promise<TaskUpdate> {
  if (IS_PREVIEW) {
    const now = new Date().toISOString();
    const u: TaskUpdate = { id: mockId(), task_id: taskId, user_id: userId, content, created_at: now, updated_at: now };
    mockUpdates.push(u);
    await logActivity(userId, taskId, "update_added");
    return u;
  }
  const { data, error } = await supabase.from("task_updates").insert({ user_id: userId, task_id: taskId, content }).select().single();
  if (error) throw error;
  await logActivity(userId, taskId, "update_added");
  return data as TaskUpdate;
}

// ─── Contacts ───

export async function fetchTaskContacts(taskId: string): Promise<TaskContact[]> {
  if (IS_PREVIEW) return mockContacts.filter((c) => c.task_id === taskId);
  const { data, error } = await supabase.from("task_contacts").select("*").eq("task_id", taskId);
  if (error) throw error;
  return (data ?? []) as TaskContact[];
}

export async function addTaskContact(
  userId: string, taskId: string,
  contact: { contact_type: "internal" | "external"; name?: string; email?: string; internal_user_id?: string }
): Promise<TaskContact> {
  if (IS_PREVIEW) {
    const c: TaskContact = {
      id: mockId(), task_id: taskId,
      contact_type: contact.contact_type,
      internal_user_id: contact.internal_user_id ?? null,
      name: contact.name ?? null, email: contact.email ?? null,
      created_at: new Date().toISOString(),
    };
    mockContacts.push(c);
    await logActivity(userId, taskId, "contact_added", "contact", null, contact.name || contact.email || null);
    return c;
  }
  const { data, error } = await supabase.from("task_contacts").insert({
    task_id: taskId,
    contact_type: contact.contact_type,
    internal_user_id: contact.internal_user_id || null,
    name: contact.name || null,
    email: contact.email || null,
  }).select().single();
  if (error) throw error;
  await logActivity(userId, taskId, "contact_added", "contact", null, contact.name || contact.email || null);
  return data as TaskContact;
}

export async function removeTaskContact(userId: string, taskId: string, contactId: string, contactName?: string): Promise<void> {
  if (IS_PREVIEW) {
    mockContacts = mockContacts.filter((c) => c.id !== contactId);
    await logActivity(userId, taskId, "contact_removed", "contact", contactName ?? null, null);
    return;
  }
  const { error } = await supabase.from("task_contacts").delete().eq("id", contactId);
  if (error) throw error;
  await logActivity(userId, taskId, "contact_removed", "contact", contactName ?? null, null);
}

// ─── Attachments ───

export async function fetchTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
  if (IS_PREVIEW) return mockAttachments.filter((a) => a.task_id === taskId);
  const { data, error } = await supabase.from("task_attachments").select("*").eq("task_id", taskId);
  if (error) throw error;
  return (data ?? []) as TaskAttachment[];
}

export async function uploadTaskAttachment(
  userId: string, taskId: string, file: File
): Promise<TaskAttachment> {
  if (IS_PREVIEW) {
    const a: TaskAttachment = {
      id: mockId(), task_id: taskId, user_id: userId,
      file_name: file.name, file_size: file.size, file_type: file.type,
      storage_path: `preview/${file.name}`,
      created_at: new Date().toISOString(),
    };
    mockAttachments.push(a);
    await logActivity(userId, taskId, "attachment_added", "attachment", null, file.name);
    return a;
  }

  const path = `${userId}/${taskId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage.from("task-attachments").upload(path, file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.from("task_attachments").insert({
    user_id: userId, task_id: taskId,
    file_name: file.name, file_size: file.size, file_type: file.type,
    storage_path: path,
  }).select().single();
  if (error) throw error;
  await logActivity(userId, taskId, "attachment_added", "attachment", null, file.name);
  return data as TaskAttachment;
}

export async function removeTaskAttachment(userId: string, taskId: string, attachment: TaskAttachment): Promise<void> {
  if (IS_PREVIEW) {
    mockAttachments = mockAttachments.filter((a) => a.id !== attachment.id);
    await logActivity(userId, taskId, "attachment_removed", "attachment", attachment.file_name, null);
    return;
  }
  await supabase.storage.from("task-attachments").remove([attachment.storage_path]);
  const { error } = await supabase.from("task_attachments").delete().eq("id", attachment.id);
  if (error) throw error;
  await logActivity(userId, taskId, "attachment_removed", "attachment", attachment.file_name, null);
}

export function getAttachmentUrl(storagePath: string): string {
  if (IS_PREVIEW) return "#";
  const { data } = supabase.storage.from("task-attachments").getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function getAttachmentSignedUrl(storagePath: string): Promise<string> {
  if (IS_PREVIEW) return "#";
  const { data, error } = await supabase.storage.from("task-attachments").createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// ─── Links ───

export async function fetchTaskLinks(taskId: string): Promise<TaskLink[]> {
  if (IS_PREVIEW) return mockLinks.filter((l) => l.task_id === taskId);
  const { data, error } = await supabase.from("task_links").select("*").eq("task_id", taskId);
  if (error) throw error;
  return (data ?? []) as TaskLink[];
}

export async function addTaskLink(userId: string, taskId: string, url: string, label?: string): Promise<TaskLink> {
  if (IS_PREVIEW) {
    const l: TaskLink = { id: mockId(), task_id: taskId, user_id: userId, url, label: label ?? null, created_at: new Date().toISOString() };
    mockLinks.push(l);
    await logActivity(userId, taskId, "link_added", "link", null, label || url);
    return l;
  }
  const { data, error } = await supabase.from("task_links").insert({ user_id: userId, task_id: taskId, url, label: label || null }).select().single();
  if (error) throw error;
  await logActivity(userId, taskId, "link_added", "link", null, label || url);
  return data as TaskLink;
}

export async function removeTaskLink(userId: string, taskId: string, linkId: string, linkLabel?: string): Promise<void> {
  if (IS_PREVIEW) {
    mockLinks = mockLinks.filter((l) => l.id !== linkId);
    await logActivity(userId, taskId, "link_removed", "link", linkLabel ?? null, null);
    return;
  }
  const { error } = await supabase.from("task_links").delete().eq("id", linkId);
  if (error) throw error;
  await logActivity(userId, taskId, "link_removed", "link", linkLabel ?? null, null);
}
