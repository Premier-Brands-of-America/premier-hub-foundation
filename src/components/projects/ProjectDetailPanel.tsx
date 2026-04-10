import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  X, Calendar, Percent, FileText, Link2, Users, MessageSquare,
  History, Plus, Trash2, Paperclip, ExternalLink, Check, RotateCcw,
  Globe, Lock, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { ProjectWithMeta, ProjectStakeholder, ProjectUpdate, ProjectActivity, ProjectAttachment, ProjectLink } from "@/types/projects";
import { FILE_EXTENSIONS, MAX_FILE_SIZE } from "@/types/tasks";
import * as projectService from "@/services/projectService";

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

  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [visibility, setVisibility] = useState(project.visibility);
  const [desiredDueDate, setDesiredDueDate] = useState(project.desired_due_date ?? "");
  const [updatedDueDate, setUpdatedDueDate] = useState(project.updated_due_date ?? "");
  const [overallPercent, setOverallPercent] = useState<string>(
    project.overall_percent_complete === null ? "na" : String(project.overall_percent_complete)
  );

  const [stakeholders, setStakeholders] = useState<(ProjectStakeholder & { name?: string; email?: string })[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [activity, setActivity] = useState<ProjectActivity[]>([]);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [links, setLinks] = useState<ProjectLink[]>([]);

  const [newUpdate, setNewUpdate] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [saving, setSaving] = useState(false);

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
  }, [project.id]);

  useEffect(() => { loadRelated(); }, [loadRelated]);

  useEffect(() => {
    setTitle(project.title);
    setDescription(project.description ?? "");
    setVisibility(project.visibility);
    setDesiredDueDate(project.desired_due_date ?? "");
    setUpdatedDueDate(project.updated_due_date ?? "");
    setOverallPercent(project.overall_percent_complete === null ? "na" : String(project.overall_percent_complete));
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

  const handleToggleStatus = async () => {
    const newStatus = project.status === "active" ? "complete" : "active";
    await saveField("status", newStatus);
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
    if (!newLinkUrl.trim()) return;
    try {
      await projectService.addProjectLink(userId, project.id, newLinkUrl.trim(), newLinkLabel.trim() || undefined);
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

  const handleRemoveStakeholder = async (s: ProjectStakeholder & { name?: string }) => {
    if (s.user_id === project.owner_id) {
      toast({ title: "Cannot remove", description: "The project owner cannot be removed from stakeholders.", variant: "destructive" });
      return;
    }
    await projectService.removeProjectStakeholder(userId, project.id, s.id, s.name);
    loadRelated();
    onProjectUpdated();
  };

  const activityLabel = (a: ProjectActivity) => {
    switch (a.action) {
      case "project_created": return "Project created";
      case "project_completed": return "Project marked complete";
      case "project_reopened": return "Project reopened";
      case "ownership_changed": return `Ownership transferred`;
      case "stakeholder_added": return `Stakeholder added: ${a.new_value ?? ""}`;
      case "stakeholder_removed": return `Stakeholder removed: ${a.old_value ?? ""}`;
      case "update_added": return "Update added";
      case "attachment_added": return `Attachment added: ${a.new_value ?? ""}`;
      case "attachment_removed": return `Attachment removed: ${a.old_value ?? ""}`;
      case "link_added": return `Link added: ${a.new_value ?? ""}`;
      case "link_removed": return `Link removed: ${a.old_value ?? ""}`;
      case "field_changed":
        return `${a.field_name ?? "Field"} changed${a.old_value ? ` from "${a.old_value}"` : ""}${a.new_value ? ` to "${a.new_value}"` : ""}`;
      default: return a.action;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full border-l border-border bg-card">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Project Detail</h2>
          {saving && <span className="text-xs text-muted-foreground">Saving...</span>}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7"><X className="h-4 w-4" /></Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Status & badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant={project.status === "complete" ? "outline" : "default"} className="gap-2" onClick={handleToggleStatus}>
              {project.status === "complete" ? <><RotateCcw className="h-3.5 w-3.5" /> Reopen</> : <><Check className="h-3.5 w-3.5" /> Mark Complete</>}
            </Button>
            <Badge variant="outline" className="gap-1 text-xs">
              {project.visibility === "public" ? <><Globe className="h-3 w-3" /> Public</> : <><Lock className="h-3 w-3" /> Private</>}
            </Badge>
            {isOwner && <Badge variant="outline" className="gap-1 text-xs"><Crown className="h-3 w-3" /> Owner</Badge>}
            {project.status === "complete" && project.completed_at && (
              <Badge variant="outline" className="text-xs">Completed {format(new Date(project.completed_at), "MMM d, yyyy")}</Badge>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)}
              onBlur={() => { if (title.trim() && title !== project.title) saveField("title", title.trim()); }}
              className="font-medium" maxLength={200} />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
              onBlur={() => { if (description !== (project.description ?? "")) saveField("description", description.trim() || null); }}
              placeholder="Add a description..." rows={3} maxLength={2000} />
          </div>

          {/* Visibility */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Visibility</Label>
            <Select value={visibility} onValueChange={(v) => { setVisibility(v as any); saveField("visibility", v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dates & percent */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Desired Due</Label>
              <Input type="date" value={desiredDueDate} onChange={(e) => { setDesiredDueDate(e.target.value); saveField("desired_due_date", e.target.value || null); }} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Updated Due</Label>
              <Input type="date" value={updatedDueDate} onChange={(e) => { setUpdatedDueDate(e.target.value); saveField("updated_due_date", e.target.value || null); }} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3" /> Overall %</Label>
              <Select value={overallPercent} onValueChange={(v) => { setOverallPercent(v); saveField("overall_percent_complete", v === "na" ? null : Number(v)); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="na">N/A</SelectItem>
                  {[0, 10, 25, 50, 75, 90, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}%</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">Created {format(new Date(project.created_at), "MMM d, yyyy 'at' h:mm a")}</div>

          <Separator />

          {/* Stakeholders */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Users className="h-3 w-3" /> Stakeholders</h3>
            {stakeholders.length > 0 && (
              <div className="space-y-1.5">
                {stakeholders.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-foreground">{s.name || s.email || s.user_id.slice(0, 8)}</span>
                      {s.user_id === project.owner_id && (
                        <Badge variant="outline" className="text-[9px] h-4 gap-0.5"><Crown className="h-2 w-2" /> Owner</Badge>
                      )}
                      {s.percent_complete !== null && (
                        <Badge variant="secondary" className="text-[9px] h-4">{s.percent_complete}%</Badge>
                      )}
                    </div>
                    {s.user_id !== project.owner_id && (isOwner || isAdmin) && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveStakeholder(s)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">Stakeholder management will be enhanced with user search in a future update.</p>
          </section>

          <Separator />

          {/* Updates */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Updates</h3>
            {updates.length > 0 && (
              <div className="space-y-2">
                {updates.map((u) => (
                  <div key={u.id} className="bg-muted/50 rounded p-2.5">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{u.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(u.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                ))}
              </div>
            )}
            <Textarea placeholder="Add an update..." value={newUpdate} onChange={(e) => setNewUpdate(e.target.value)} className="text-xs min-h-[60px]" maxLength={2000} />
            <Button size="sm" onClick={handleAddUpdate} disabled={!newUpdate.trim()} className="gap-1"><Plus className="h-3 w-3" /> Add Update</Button>
          </section>

          <Separator />

          {/* Attachments */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Paperclip className="h-3 w-3" /> Attachments</h3>
            {attachments.length > 0 && (
              <div className="space-y-1.5">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-2 py-1.5">
                    <button onClick={() => handleDownloadAttachment(att)} className="text-foreground hover:text-accent truncate text-left">
                      {att.file_name} <span className="text-muted-foreground text-xs ml-1">({formatBytes(att.file_size)})</span>
                    </button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveAttachment(att)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            )}
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm text-accent hover:underline">
              <Plus className="h-3 w-3" /> Upload file
              <input type="file" accept={FILE_EXTENSIONS} onChange={handleFileUpload} className="hidden" />
            </label>
            <p className="text-[10px] text-muted-foreground">Max 25 MB. PDF, Office, images, CSV, TXT</p>
          </section>

          <Separator />

          {/* Links */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Link2 className="h-3 w-3" /> Links</h3>
            {links.length > 0 && (
              <div className="space-y-1.5">
                {links.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-2 py-1.5">
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate flex items-center gap-1">
                      <ExternalLink className="h-3 w-3 shrink-0" />{l.label || l.url}
                    </a>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveLink(l)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input placeholder="URL" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} className="h-8 text-xs" />
              <Input placeholder="Label (optional)" value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} className="h-8 text-xs" />
              <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={handleAddLink}><Plus className="h-3 w-3" /></Button>
            </div>
          </section>

          <Separator />

          {/* Activity Trail */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><History className="h-3 w-3" /> Activity Trail</h3>
            {activity.length > 0 ? (
              <div className="space-y-1">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-xs py-1">
                    <div className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
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
