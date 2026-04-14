import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import * as taskService from "@/services/taskService";
import { showErrorToast } from "@/lib/error-toast";
import type { Task, TaskContact, TaskUpdate, TaskActivity, TaskAttachment, TaskLink } from "@/types/tasks";

export function useTaskDetail(task: Task) {
  const { user, profile } = useAuth();
  const userId = user?.id ?? profile?.user_id ?? "";

  const [contacts, setContacts] = useState<TaskContact[]>([]);
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [links, setLinks] = useState<TaskLink[]>([]);
  const [saving, setSaving] = useState(false);

  const loadRelatedData = useCallback(async () => {
    try {
      const [c, u, a, att, l] = await Promise.all([
        taskService.fetchTaskContacts(task.id),
        taskService.fetchTaskUpdates(task.id),
        taskService.fetchTaskActivity(task.id),
        taskService.fetchTaskAttachments(task.id),
        taskService.fetchTaskLinks(task.id),
      ]);
      setContacts(c);
      setUpdates(u);
      setActivity(a);
      setAttachments(att);
      setLinks(l);
    } catch (err) {
      showErrorToast(err, "Error loading task details");
    }
  }, [task.id]);

  useEffect(() => { loadRelatedData(); }, [loadRelatedData]);

  const saveField = useCallback(async (field: string, value: string | number | null) => {
    setSaving(true);
    try {
      await taskService.updateTask(userId, task.id, { [field]: value } as Record<string, unknown>, task);
    } catch (err) {
      showErrorToast(err, "Error saving field");
    } finally {
      setSaving(false);
    }
  }, [task, userId]);

  const addUpdate = useCallback(async (content: string) => {
    try {
      await taskService.addTaskUpdate(userId, task.id, content);
      await loadRelatedData();
    } catch (err) {
      showErrorToast(err, "Error adding update");
    }
  }, [userId, task.id, loadRelatedData]);

  const addContact = useCallback(async (contact: { contact_type: "internal" | "external"; name?: string; email?: string; internal_user_id?: string }) => {
    try {
      await taskService.addTaskContact(userId, task.id, contact);
      await loadRelatedData();
    } catch (err) {
      showErrorToast(err, "Error adding contact");
    }
  }, [userId, task.id, loadRelatedData]);

  const removeContact = useCallback(async (contactId: string, contactName?: string) => {
    await taskService.removeTaskContact(userId, task.id, contactId, contactName);
    await loadRelatedData();
  }, [userId, task.id, loadRelatedData]);

  const uploadAttachment = useCallback(async (file: File) => {
    try {
      await taskService.uploadTaskAttachment(userId, task.id, file);
      await loadRelatedData();
    } catch (err) {
      showErrorToast(err, "Upload failed");
    }
  }, [userId, task.id, loadRelatedData]);

  const removeAttachment = useCallback(async (att: TaskAttachment) => {
    await taskService.removeTaskAttachment(userId, task.id, att);
    await loadRelatedData();
  }, [userId, task.id, loadRelatedData]);

  const addLink = useCallback(async (url: string, label?: string) => {
    try {
      await taskService.addTaskLink(userId, task.id, url, label);
      await loadRelatedData();
    } catch (err) {
      showErrorToast(err, "Error adding link");
    }
  }, [userId, task.id, loadRelatedData]);

  const removeLink = useCallback(async (linkId: string, linkLabel?: string) => {
    await taskService.removeTaskLink(userId, task.id, linkId, linkLabel);
    await loadRelatedData();
  }, [userId, task.id, loadRelatedData]);

  return {
    userId, contacts, updates, activity, attachments, links, saving,
    saveField, loadRelatedData,
    addUpdate, addContact, removeContact,
    uploadAttachment, removeAttachment,
    addLink, removeLink,
  };
}
