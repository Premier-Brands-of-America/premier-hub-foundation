import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  X, Calendar, Percent, FileText, Link2, Users, MessageSquare,
  History, Plus, Trash2, Paperclip, ExternalLink, Check, RotateCcw,
  Globe, Lock, Crown, Edit3, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RelationsSection } from "@/components/relations/RelationsSection";
import { BacklinksPanel } from "@/components/pages/BacklinksPanel";
import { OutlookCalendarPanel } from "@/components/integrations/outlook";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type {
  ProjectWithMeta, EnrichedStakeholder, ProjectUpdate,
  ProjectActivity, ProjectAttachment, ProjectLink, StakeholderProfile,
} from "@/types/projects";
import { FILE_EXTENSIONS, MAX_FILE_SIZE } from "@/types/tasks";
import * as projectService from "@/services/projectService";
import { StakeholderPicker } from "./StakeholderPicker";
import { EntityAvatar } from "@/components/common/EntityAvatar";
import { AvatarPicker } from "@/components/common/AvatarPicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ProjectDetailPanelProps {
  project: ProjectWithMeta;
  onClose: () => void;
  onProjectUpdated: () => void;
}

export function ProjectDetailPanel({ project, onClose, onProjectUpdated }: ProjectDetailPanelProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const userId = user?.id ?? profile?.user_id ?? "";
  const isOwner = project.owner_id === userId;
  const isAdmin = profile?.is_admin ?? false;

  // Editable fields
  const [editingHeader, setEditingHeader] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [visibility, setVisibility] = useState(project.visibility);
  const [desiredDueDate, setDesiredDueDate] = useState(project.desired_due_date ?? "");
  const [updatedDueDate, setUpdatedDueDate] = useState(project.updated_due_date ?? "");
  const [overallPercent, setOverallPercent] = useState<string>(
    project.overall_percent_complete === null ? "na" : String(project.overall_percent_complete)
  );

  // Related data
  const [stakeholders, setStakeholders] = useState<EnrichedStakeholder[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [activity, setActivity] = useState<ProjectActivity[]>([]);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [links, setLinks] = useState<ProjectLink[]>([]);

  const [newUpdate, setNewUpdate] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [saving, setSaving] = useState(false);

  // Update editing
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editingUpdateContent, setEditingUpdateContent] = useState("");

  // Profile name cache for display
  const [nameCache, setNameCache] = useState<Record<string, string>>({});

  const resolveName = useCallback(async (uid: string) => {
    if (nameCache[uid]) return;
    const name = await projectService.resolveProfileName(uid);
    setNameCache((prev) => ({ ...prev, [uid]: name }));
  }, [nameCache]);

  const loadRelated = useCallback(async () => {
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

    // Resolve names for update authors/editors and activity users
    const userIds = new Set<string>();
    u.forEach((upd) => { userIds.add(upd.user_id); if (upd.edited_by) userIds.add(upd.edited_by); });
    a.forEach((act) => userIds.add(act.user_id));
    userIds.add(project.owner_id);
    userIds.forEach((uid) => resolveName(uid));
  }, [project.id, project.owner_id, resolveName]);

  useEffect(() => { loadRelated(); }, [loadRelated]);

  useEffect(() => {
    setTitle(project.title);
    setDescription(project.description ?? "");
    setVisibility(project.visibility);
    setDesiredDueDate(project.desired_due_date ?? "");
    setUpdatedDueDate(project.updated_due_date ?? "");
    setOverallPercent(project.overall_percent_complete === null ? "na" : String(project.overall_percent_complete));
    setEditingHeader(false);
  }, [project]);

  const saveField = async (field: string, value: any) => {
    setSaving(true);
    try {
      await projectService.updateProject(userId, project.id, { [field]: value }, project);
      onProjectUpdated();
      loadRelated();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHeader = async () => {
    setSaving(true);
    try {
      const changes: Record<string, any> = {};
      if (title.trim() && title !== project.title) changes.title = title.trim();
      if (description !== (project.description ?? "")) changes.description = description.trim() || null;
      if (Object.keys(changes).length > 0) {
        await projectService.updateProject(userId, project.id, changes, project);
        onProjectUpdated();
        loadRelated();
      }
      setEditingHeader(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = project.status === "active" ? "complete" : "active";
    await saveField("status", newStatus);
  };

  const handleChangeOwnership = async (newOwnerId: string) => {
    await saveField("owner_id", newOwnerId);
  };

  const handleAddUpdate = async () => {
    if (!newUpdate.trim()) return;
    try {
      await projectService.addProjectUpdate(userId, project.id, newUpdate.trim());
      setNewUpdate("");
      loadRelated();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveUpdateEdit = async () => {
    if (!editingUpdateId || !editingUpdateContent.trim()) return;
    try {
      await projectService.editProjectUpdate(userId, project.id, editingUpdateId, editingUpdateContent.trim());
      setEditingUpdateId(null);
      setEditingUpdateContent("");
      loadRelated();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Maximum file size is 25 MB.", variant: "destructive" });
      return;
    }
    try {
      await projectService.uploadProjectAttachment(userId, project.id, file);
      loadRelated();
      toast({ title: "Attachment uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    e.target.value = "";
  };

  const handleRemoveAttachment = async (att: ProjectAttachment) => {
    await projectService.removeProjectAttachment(userId, project.id, att);
    loadRelated();
  };

  const handleDownloadAttachment = async (att: ProjectAttachment) => {
    const url = await projectService.getProjectAttachmentSignedUrl(att.storage_path);
    window.open(url, "_blank");
  };

  const handleAddLink = async () => {
    const url = newLinkUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      toast({ title: "Invalid URL", description: "Only http:// and https:// URLs are allowed.", variant: "destructive" });
      return;
    }
    try {
      await projectService.addProjectLink(userId, project.id, url, newLinkLabel.trim() || undefined);
      setNewLinkUrl("");
      setNewLinkLabel("");
      loadRelated();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveLink = async (link: ProjectLink) => {
    await projectService.removeProjectLink(userId, project.id, link.id, link.label ?? link.url);
    loadRelated();
  };

  const handleAddStakeholder = async (sp: StakeholderProfile) => {
    try {
      await projectService.addProjectStakeholder(userId, project.id, sp);
      loadRelated();
      onProjectUpdated();
      toast({ title: `${sp.full_name || sp.email} added as stakeholder` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveStakeholder = async (s: EnrichedStakeholder) => {
    if (s.user_id === project.owner_id) {
      toast({ title: "Cannot remove", description: "The project owner cannot be removed from stakeholders.", variant: "destructive" });
      return;
    }
    await projectService.removeProjectStakeholder(userId, project.id, s.id, s.full_name ?? undefined);
    loadRelated();
    onProjectUpdated();
  };

  const handleStakeholderPercentChange = async (s: EnrichedStakeholder, value: string) => {
    const percent = value === "na" ? null : Number(value);
    await projectService.updateStakeholderPercent(userId, project.id, s.id, percent);
    loadRelated();
  };

  const isStakeholder = stakeholders.some((s) => s.user_id === userId);
  const canEdit = isOwner || isAdmin || isStakeholder;

  const getName = (uid: string) => nameCache[uid] || uid.slice(0, 8);

  const activityLabel = (a: ProjectActivity) => {
    const actor = getName(a.user_id);
    switch (a.action) {
      case "project_created": return `${actor} created the project`;
      case "project_completed": return `${actor} marked the project complete`;
      case "project_reopened": return `${actor} reopened the project`;
      case "ownership_changed": return `${actor} transferred ownership`;
      case "stakeholder_added": return `${actor} added stakeholder: ${a.new_value ?? ""}`;
      case "stakeholder_removed": return `${actor} removed stakeholder: ${a.old_value ?? ""}`;
      case "update_added": return `${actor} added an update`;
      case "update_edited": return `${actor} edited an update`;
      case "attachment_added": return `${actor} added attachment: ${a.new_value ?? ""}`;
      case "attachment_removed": return `${actor} removed attachment: ${a.old_value ?? ""}`;
      case "link_added": return `${actor} added link: ${a.new_value ?? ""}`;
      case "link_removed": return `${actor} removed link: ${a.old_value ?? ""}`;
      case "field_changed":
        return `${actor} changed ${a.field_name ?? "field"}${a.old_value ? ` from "${a.old_value}"` : ""}${a.new_value ? ` to "${a.new_value}"` : ""}`;
      default: return `${actor}: ${a.action}`;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full border-l border-border bg-card">
      {/* ─── Header bar ─── */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--entity-project))]" aria-hidden />
          <h3 className="truncate text-sm font-semibold text-foreground">Project detail</h3>
          {saving && <span className="shrink-0 text-xs text-muted-foreground">Saving…</span>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Close project detail"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ─── Title + meta block ─── */}
      <div className="border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          {canEdit ? (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="shrink-0 rounded-md transition-transform hover:-translate-y-0.5" aria-label="Change project icon">
                  <EntityAvatar type="project" seed={project.id} name={project.title} src={(project as any).icon} size="lg" glow />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72">
                <AvatarPicker type="project" value={(project as any).icon ?? ""} onChange={(uri) => saveField("icon", uri)} />
              </PopoverContent>
            </Popover>
          ) : (
            <EntityAvatar type="project" seed={project.id} name={project.title} src={(project as any).icon} size="lg" glow />
          )}
          <div className="flex-1 min-w-0">
            {editingHeader ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-semibold text-base h-8"
                maxLength={200}
                autoFocus
              />
            ) : (
              <h2 className="text-base font-semibold text-foreground truncate font-display tracking-tight">{project.title}</h2>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canEdit && !editingHeader && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setEditingHeader(true)} aria-label="Edit project">
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
            )}
            {editingHeader && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleSaveHeader} aria-label="Save changes">
                <Save className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Status / visibility / owner badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 rounded-full border border-transparent bg-[hsl(var(--entity-project)/0.12)] px-2.5 py-0.5 text-[11px] font-medium text-[hsl(var(--entity-project))]">
            {project.visibility === "public" ? <><Globe className="h-3 w-3" /> Public</> : <><Lock className="h-3 w-3" /> Private</>}
          </span>
          {project.status === "complete" ? (
            <span className="inline-flex items-center rounded-full border border-transparent bg-[hsl(var(--status-done)/0.14)] px-2.5 py-0.5 text-[11px] font-medium text-[hsl(var(--status-done))]">
              Complete
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-transparent bg-[hsl(var(--status-warning)/0.14)] px-2.5 py-0.5 text-[11px] font-medium text-[hsl(var(--status-warning))]">
              Active
            </span>
          )}
          {isOwner && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Crown className="h-3 w-3" /> Owner
            </span>
          )}
        </div>

        {/* Header action controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <Button size="sm" variant={project.status === "complete" ? "outline" : "default"} className="gap-1.5 h-8 text-xs" onClick={handleToggleStatus}>
              {project.status === "complete" ? <><RotateCcw className="h-3 w-3" /> Reopen</> : <><Check className="h-3 w-3" /> Complete</>}
            </Button>
          )}
          {canEdit && (
            <Select value={visibility} onValueChange={(v) => { setVisibility(v as any); saveField("visibility", v); }}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          )}
          {/* Ownership transfer: only owner/admin, pick from stakeholders */}
          {(isOwner || isAdmin) && stakeholders.length > 1 && (
            <Select value={project.owner_id} onValueChange={handleChangeOwnership}>
              <SelectTrigger className="h-8 text-xs w-auto gap-1">
                <Crown className="h-3 w-3" />
                <span className="max-w-[100px] truncate">{getName(project.owner_id)}</span>
              </SelectTrigger>
              <SelectContent>
                {stakeholders.map((s) => (
                  <SelectItem key={s.user_id} value={s.user_id}>
                    {s.full_name || s.email || s.user_id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Owner: {getName(project.owner_id)} · Created {format(new Date(project.created_at), "MMM d, yyyy")}
          {project.completed_at && ` · Completed ${format(new Date(project.completed_at), "MMM d, yyyy")}`}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">

          {/* ─── Core Info ─── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <FileText className="h-3 w-3" /> Details
            </h3>

            {editingHeader ? (
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..." rows={3} maxLength={2000} className="text-sm" />
            ) : (
              description ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">{description}</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">No description</p>
              )
            )}

            {canEdit && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Desired Due</Label>
                  <Input type="date" value={desiredDueDate} className="h-8 text-xs"
                    onChange={(e) => { setDesiredDueDate(e.target.value); saveField("desired_due_date", e.target.value || null); }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Updated Due</Label>
                  <Input type="date" value={updatedDueDate} className="h-8 text-xs"
                    onChange={(e) => { setUpdatedDueDate(e.target.value); saveField("updated_due_date", e.target.value || null); }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3" /> Overall %</Label>
                  <Select value={overallPercent} onValueChange={(v) => { setOverallPercent(v); saveField("overall_percent_complete", v === "na" ? null : Number(v)); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="na">N/A</SelectItem>
                      {[0, 10, 25, 50, 75, 90, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}%</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {!canEdit && (desiredDueDate || updatedDueDate || project.overall_percent_complete !== null) && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {desiredDueDate && <span>Desired: {format(new Date(desiredDueDate), "MMM d, yyyy")}</span>}
                {updatedDueDate && <span>Updated: {format(new Date(updatedDueDate), "MMM d, yyyy")}</span>}
                {project.overall_percent_complete !== null && <span>{project.overall_percent_complete}% complete</span>}
              </div>
            )}
          </section>

          <Separator />

          {/* ─── Stakeholders ─── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Users className="h-3 w-3" /> Stakeholders ({stakeholders.length})
              </h3>
              {(isOwner || isAdmin || isStakeholder) && (
                <StakeholderPicker
                  existingUserIds={stakeholders.map((s) => s.user_id)}
                  onSelect={handleAddStakeholder}
                />
              )}
            </div>

            {stakeholders.length > 0 && (
              <div className="space-y-1.5">
                {stakeholders.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm rounded-md border border-border bg-muted/30 px-2.5 py-2 group">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-6 h-6 rounded-full bg-[hsl(var(--entity-person)/0.14)] flex items-center justify-center text-[10px] font-medium text-[hsl(var(--entity-person))] shrink-0">
                        {(s.full_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <span className="text-foreground truncate cursor-default">
                            {s.full_name || s.email || s.user_id.slice(0, 8)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-0.5 text-xs">
                            <p className="font-medium">{s.full_name || "Unknown"}</p>
                            {s.title && <p className="text-muted-foreground">{s.title}</p>}
                            {s.department && <p className="text-muted-foreground">Dept: {s.department}</p>}
                            {s.manager_email && <p className="text-muted-foreground">Reports to: {s.manager_email}</p>}
                            {s.email && <p className="text-muted-foreground">{s.email}</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                      {s.user_id === project.owner_id && (
                        <Badge variant="outline" className="text-[9px] h-4 gap-0.5 shrink-0"><Crown className="h-2 w-2" /> Owner</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {canEdit && (
                        <Select
                          value={s.percent_complete === null ? "na" : String(s.percent_complete)}
                          onValueChange={(v) => handleStakeholderPercentChange(s, v)}
                        >
                          <SelectTrigger className="h-6 w-16 text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="na">N/A</SelectItem>
                            {[0, 10, 25, 50, 75, 90, 100].map((n) => (
                              <SelectItem key={n} value={String(n)}>{n}%</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {!canEdit && s.percent_complete !== null && (
                        <Badge variant="secondary" className="text-[9px] h-4">{s.percent_complete}%</Badge>
                      )}
                      {s.user_id !== project.owner_id && (isOwner || isAdmin) && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveStakeholder(s)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* ─── Updates ─── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Updates ({updates.length})
            </h3>

            {canEdit && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Write an update..."
                  value={newUpdate}
                  onChange={(e) => setNewUpdate(e.target.value)}
                  className="text-xs min-h-[60px]"
                  maxLength={2000}
                />
                <Button size="sm" onClick={handleAddUpdate} disabled={!newUpdate.trim()} className="gap-1">
                  <Plus className="h-3 w-3" /> Add Update
                </Button>
              </div>
            )}

            {updates.length > 0 && (
              <div className="space-y-2">
                {updates.map((u) => (
                  <div key={u.id} className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5 group">
                    {editingUpdateId === u.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingUpdateContent}
                          onChange={(e) => setEditingUpdateContent(e.target.value)}
                          className="text-sm min-h-[60px]"
                          maxLength={2000}
                          autoFocus
                        />
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="default" className="h-6 text-xs gap-1" onClick={handleSaveUpdateEdit}>
                            <Save className="h-3 w-3" /> Save
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setEditingUpdateId(null); setEditingUpdateContent(""); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{u.content}</p>
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] text-muted-foreground space-x-1.5">
                            <span className="font-medium">{getName(u.user_id)}</span>
                            <span>· {format(new Date(u.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                            {u.edited_by && u.updated_at !== u.created_at && (
                              <span className="italic">
                                · edited by {getName(u.edited_by)} {format(new Date(u.updated_at), "MMM d 'at' h:mm a")}
                              </span>
                            )}
                          </div>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => { setEditingUpdateId(u.id); setEditingUpdateContent(u.content); }}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {updates.length === 0 && !canEdit && (
              <p className="text-xs text-muted-foreground">No updates yet.</p>
            )}
          </section>

          <Separator />

          {/* ─── Attachments ─── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Paperclip className="h-3 w-3" /> Attachments ({attachments.length})
            </h3>
            {attachments.length > 0 && (
              <div className="space-y-1.5">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between text-sm rounded-md border border-border bg-muted/30 px-2.5 py-1.5 group">
                    <button onClick={() => handleDownloadAttachment(att)} className="inline-flex items-center gap-1.5 text-foreground hover:text-primary truncate text-left transition-colors">
                      <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{att.file_name}</span>
                      <span className="text-muted-foreground text-xs">({formatBytes(att.file_size)})</span>
                    </button>
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100" onClick={() => handleRemoveAttachment(att)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canEdit && (
              <>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm text-primary hover:underline">
                  <Plus className="h-3 w-3" /> Upload file
                  <input type="file" accept={FILE_EXTENSIONS} onChange={handleFileUpload} className="hidden" />
                </label>
                <p className="text-[11px] text-muted-foreground">Max 25 MB. PDF, Office, images, CSV, TXT</p>
              </>
            )}
          </section>

          <Separator />

          {/* ─── Links ─── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Link2 className="h-3 w-3" /> Links ({links.length})
            </h3>
            {links.length > 0 && (
              <div className="space-y-1.5">
                {links.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-sm rounded-md border border-border bg-muted/30 px-2.5 py-1.5 group">
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex items-center gap-1.5">
                      <ExternalLink className="h-3 w-3 shrink-0" /><span className="truncate">{l.label || l.url}</span>
                    </a>
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100" onClick={() => handleRemoveLink(l)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canEdit && (
              <div className="flex gap-2">
                <Input placeholder="URL" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} className="h-8 text-xs" />
                <Input placeholder="Label (optional)" value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} className="h-8 text-xs" />
                <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={handleAddLink}><Plus className="h-3 w-3" /></Button>
              </div>
            )}
          </section>

          <Separator />

          {/* ─── Relations ─── */}
          <RelationsSection
            ownerRef={{ entityType: "project", entityId: project.id, title: project.title }}
            editable
          />

          <BacklinksPanel targetType="project" targetId={project.id} />

          <Separator />

          {/* ─── Outlook calendar + email (INTEG-OUTLOOK) ─── */}
          <OutlookCalendarPanel projectId={project.id} />

          <Separator />

          {/* ─── Activity Trail ─── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <History className="h-3 w-3" /> Activity Trail
            </h3>
            {activity.length > 0 ? (
              <div className="space-y-1">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-xs py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                    <div>
                      <span className="text-foreground">{activityLabel(a)}</span>
                      <span className="text-muted-foreground ml-1.5">{format(new Date(a.created_at), "MMM d 'at' h:mm a")}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No activity yet.</p>
            )}
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
