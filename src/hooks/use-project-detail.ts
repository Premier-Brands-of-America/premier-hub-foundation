import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import * as projectService from "@/services/projectService";
import { showErrorToast } from "@/lib/error-toast";
import type {
  ProjectWithMeta, EnrichedStakeholder, ProjectUpdate,
  ProjectActivity, ProjectAttachment, ProjectLink, StakeholderProfile,
} from "@/types/projects";

export function useProjectDetail(project: ProjectWithMeta) {
  const { user, profile } = useAuth();
  const userId = user?.id ?? profile?.user_id ?? "";

  const [stakeholders, setStakeholders] = useState<EnrichedStakeholder[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [activity, setActivity] = useState<ProjectActivity[]>([]);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [links, setLinks] = useState<ProjectLink[]>([]);
  const [nameCache, setNameCache] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const isOwner = project.owner_id === userId;
  const isAdmin = profile?.is_admin ?? false;
  const isStakeholder = stakeholders.some((s) => s.user_id === userId);
  const canEdit = isOwner || isAdmin || isStakeholder;

  const resolveName = useCallback(async (uid: string) => {
    if (nameCache[uid]) return;
    const name = await projectService.resolveProfileName(uid);
    setNameCache((prev) => ({ ...prev, [uid]: name }));
  }, [nameCache]);

  const loadRelatedData = useCallback(async () => {
    try {
      const [s, u, a, att, l] = await Promise.all([
        projectService.fetchProjectStakeholders(project.id),
        projectService.fetchProjectUpdates(project.id),
        projectService.fetchProjectActivity(project.id),
        projectService.fetchProjectAttachments(project.id),
        projectService.fetchProjectLinks(project.id),
      ]);
      setStakeholders(s);
      setUpdates(u);
      setActivity(a);
      setAttachments(att);
      setLinks(l);

      const userIds = new Set<string>();
      u.forEach((upd) => { userIds.add(upd.user_id); if (upd.edited_by) userIds.add(upd.edited_by); });
      a.forEach((act) => userIds.add(act.user_id));
      userIds.add(project.owner_id);
      userIds.forEach((uid) => resolveName(uid));
    } catch (err) {
      showErrorToast(err, "Error loading project details");
    }
  }, [project.id, project.owner_id, resolveName]);

  useEffect(() => { loadRelatedData(); }, [loadRelatedData]);

  const getName = useCallback((uid: string) => nameCache[uid] || uid.slice(0, 8), [nameCache]);

  const saveField = useCallback(async (field: string, value: unknown) => {
    setSaving(true);
    try {
      await projectService.updateProject(userId, project.id, { [field]: value } as Record<string, unknown>, project);
    } catch (err) {
      showErrorToast(err, "Error saving field");
    } finally {
      setSaving(false);
    }
  }, [project, userId]);

  const addUpdate = useCallback(async (content: string) => {
    try {
      await projectService.addProjectUpdate(userId, project.id, content);
      await loadRelatedData();
    } catch (err) {
      showErrorToast(err, "Error adding update");
    }
  }, [userId, project.id, loadRelatedData]);

  const editUpdate = useCallback(async (updateId: string, content: string) => {
    try {
      await projectService.editProjectUpdate(userId, project.id, updateId, content);
      await loadRelatedData();
    } catch (err) {
      showErrorToast(err, "Error editing update");
    }
  }, [userId, project.id, loadRelatedData]);

  const addStakeholder = useCallback(async (sp: StakeholderProfile) => {
    try {
      await projectService.addProjectStakeholder(userId, project.id, sp);
      await loadRelatedData();
    } catch (err) {
      showErrorToast(err, "Error adding stakeholder");
    }
  }, [userId, project.id, loadRelatedData]);

  const removeStakeholder = useCallback(async (stakeholderId: string, name?: string) => {
    await projectService.removeProjectStakeholder(userId, project.id, stakeholderId, name);
    await loadRelatedData();
  }, [userId, project.id, loadRelatedData]);

  const updateStakeholderPercent = useCallback(async (stakeholderId: string, percent: number | null) => {
    await projectService.updateStakeholderPercent(userId, project.id, stakeholderId, percent);
    await loadRelatedData();
  }, [userId, project.id, loadRelatedData]);

  const uploadAttachment = useCallback(async (file: File) => {
    try {
      await projectService.uploadProjectAttachment(userId, project.id, file);
      await loadRelatedData();
    } catch (err) {
      showErrorToast(err, "Upload failed");
    }
  }, [userId, project.id, loadRelatedData]);

  const removeAttachment = useCallback(async (att: ProjectAttachment) => {
    await projectService.removeProjectAttachment(userId, project.id, att);
    await loadRelatedData();
  }, [userId, project.id, loadRelatedData]);

  const addLink = useCallback(async (url: string, label?: string) => {
    try {
      await projectService.addProjectLink(userId, project.id, url, label);
      await loadRelatedData();
    } catch (err) {
      showErrorToast(err, "Error adding link");
    }
  }, [userId, project.id, loadRelatedData]);

  const removeLink = useCallback(async (linkId: string, linkLabel?: string) => {
    await projectService.removeProjectLink(userId, project.id, linkId, linkLabel);
    await loadRelatedData();
  }, [userId, project.id, loadRelatedData]);

  const changeOwnership = useCallback(async (newOwnerId: string) => {
    await saveField("owner_id", newOwnerId);
  }, [saveField]);

  return {
    userId, stakeholders, updates, activity, attachments, links,
    nameCache, getName, saving,
    isOwner, isAdmin, isStakeholder, canEdit,
    saveField, loadRelatedData,
    addUpdate, editUpdate,
    addStakeholder, removeStakeholder, updateStakeholderPercent,
    uploadAttachment, removeAttachment,
    addLink, removeLink, changeOwnership,
  };
}
