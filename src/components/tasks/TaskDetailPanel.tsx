import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  X, Calendar, Percent, FileText, Link2, Users, MessageSquare,
  History, Plus, Trash2, Paperclip, ExternalLink, Check, RotateCcw,
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
import type { Task, TaskContact, TaskUpdate, TaskActivity, TaskAttachment, TaskLink } from "@/types/tasks";
import { FILE_EXTENSIONS, MAX_FILE_SIZE } from "@/types/tasks";
import * as taskService from "@/services/taskService";
import { OpenInMemoryGraphButton } from "@/components/graph/OpenInMemoryGraphButton";
import { RelationsSection } from "@/components/relations/RelationsSection";
import { BacklinksPanel } from "@/components/pages/BacklinksPanel";
import { EntityAvatar } from "@/components/common/EntityAvatar";
import { AvatarPicker } from "@/components/common/AvatarPicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export function TaskDetailPanel({ task, onClose, onTaskUpdated }: TaskDetailPanelProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const userId = user?.id ?? profile?.user_id ?? "";

  // Editable fields
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [percentComplete, setPercentComplete] = useState<string>(
    task.percent_complete === null ? "na" : String(task.percent_complete)
  );

  // Related data
  const [contacts, setContacts] = useState<TaskContact[]>([]);
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [links, setLinks] = useState<TaskLink[]>([]);

  // Input states
  const [newUpdate, setNewUpdate] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const loadRelatedData = useCallback(async () => {
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
  }, [task.id]);

  useEffect(() => {
    loadRelatedData();
  }, [loadRelatedData]);

  // Reset fields when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setDueDate(task.due_date ?? "");
    setPercentComplete(task.percent_complete === null ? "na" : String(task.percent_complete));
  }, [task]);

  const saveField = async (field: string, value: any) => {
    setSaving(true);
    try {
      await taskService.updateTask(userId, task.id, { [field]: value }, task);
      onTaskUpdated();
      loadRelatedData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = task.status === "active" ? "complete" : "active";
    await saveField("status", newStatus);
  };

  const handleAddUpdate = async () => {
    if (!newUpdate.trim()) return;
    try {
      await taskService.addTaskUpdate(userId, task.id, newUpdate.trim());
      setNewUpdate("");
      loadRelatedData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAddContact = async () => {
    if (!newContactName.trim() && !newContactEmail.trim()) return;
    try {
      await taskService.addTaskContact(userId, task.id, {
        contact_type: "external",
        name: newContactName.trim() || undefined,
        email: newContactEmail.trim() || undefined,
      });
      setNewContactName("");
      setNewContactEmail("");
      loadRelatedData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveContact = async (contact: TaskContact) => {
    await taskService.removeTaskContact(userId, task.id, contact.id, contact.name ?? contact.email ?? undefined);
    loadRelatedData();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Maximum file size is 25 MB.", variant: "destructive" });
      return;
    }
    try {
      await taskService.uploadTaskAttachment(userId, task.id, file);
      loadRelatedData();
      toast({ title: "Attachment uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    e.target.value = "";
  };

  const handleRemoveAttachment = async (att: TaskAttachment) => {
    await taskService.removeTaskAttachment(userId, task.id, att);
    loadRelatedData();
  };

  const handleAddLink = async () => {
    const url = newLinkUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      toast({ title: "Invalid URL", description: "Only http:// and https:// URLs are allowed.", variant: "destructive" });
      return;
    }
    try {
      await taskService.addTaskLink(userId, task.id, url, newLinkLabel.trim() || undefined);
      setNewLinkUrl("");
      setNewLinkLabel("");
      loadRelatedData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveLink = async (link: TaskLink) => {
    await taskService.removeTaskLink(userId, task.id, link.id, link.label ?? link.url);
    loadRelatedData();
  };

  const handleDownloadAttachment = async (att: TaskAttachment) => {
    const url = await taskService.getAttachmentSignedUrl(att.storage_path);
    window.open(url, "_blank");
  };

  const activityLabel = (a: TaskActivity) => {
    switch (a.action) {
      case "task_created": return "Task created";
      case "task_completed": return "Task marked complete";
      case "task_reopened": return "Task reopened";
      case "update_added": return "Update added";
      case "attachment_added": return `Attachment added: ${a.new_value ?? ""}`;
      case "attachment_removed": return `Attachment removed: ${a.old_value ?? ""}`;
      case "contact_added": return `Contact added: ${a.new_value ?? ""}`;
      case "contact_removed": return `Contact removed: ${a.old_value ?? ""}`;
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
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2 min-w-0">
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="shrink-0 rounded-md transition-transform hover:-translate-y-0.5" aria-label="Change task icon">
                <EntityAvatar type="task" seed={task.id} name={task.title} src={(task as any).icon} size="sm" glow />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72">
              <AvatarPicker type="task" value={(task as any).icon ?? ""} onChange={(uri) => saveField("icon", uri)} />
            </PopoverContent>
          </Popover>
          <h3 className="truncate text-sm font-semibold text-foreground">Task detail</h3>
          {saving && <span className="shrink-0 text-xs text-muted-foreground">Saving…</span>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Close task detail"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Status toggle */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={task.status === "complete" ? "outline" : "default"}
              className="gap-2"
              onClick={handleToggleStatus}
            >
              {task.status === "complete" ? (
                <><RotateCcw className="h-3.5 w-3.5" /> Reopen</>
              ) : (
                <><Check className="h-3.5 w-3.5" /> Mark complete</>
              )}
            </Button>
            {task.status === "complete" && (
              <Badge variant="success" className="text-xs">
                Completed {task.completed_at ? format(new Date(task.completed_at), "MMM d, yyyy") : ""}
              </Badge>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => { if (title.trim() && title !== task.title) saveField("title", title.trim()); }}
              className="font-medium"
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" /> Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => {
                if (description !== (task.description ?? ""))
                  saveField("description", description.trim() || null);
              }}
              placeholder="Add a description..."
              rows={3}
              maxLength={2000}
            />
          </div>

          {/* Due date & percent */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Due Date
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  saveField("due_date", e.target.value || null);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Percent className="h-3 w-3" /> % Complete
              </Label>
              <Select
                value={percentComplete}
                onValueChange={(v) => {
                  setPercentComplete(v);
                  saveField("percent_complete", v === "na" ? null : Number(v));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="na">N/A</SelectItem>
                  {[0, 10, 25, 50, 75, 90, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Visibility</Label>
            <Select
              value={task.visibility ?? "private"}
              onValueChange={(v) => saveField("visibility", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private — only you, your manager, and admins</SelectItem>
                <SelectItem value="public">Public — anyone in the org</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <OpenInMemoryGraphButton type="task" id={task.id} variant="outline" className="w-full" />

          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Created {format(new Date(task.created_at), "MMM d, yyyy 'at' h:mm a")}
          </div>

          <Separator />

          {/* Related Contacts */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Users className="h-3 w-3" /> Related Contacts
            </h3>
            {contacts.length > 0 && (
              <div className="space-y-1.5">
                {contacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
                    <div>
                      <span className="text-foreground">{c.name || c.email || "Unknown"}</span>
                      {c.email && c.name && (
                        <span className="text-muted-foreground text-xs ml-1">({c.email})</span>
                      )}
                      <Badge variant="outline" className="text-[9px] ml-1.5 h-4">{c.contact_type}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveContact(c)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Name"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="h-8 text-xs"
              />
              <Input
                placeholder="Email"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
                className="h-8 text-xs"
              />
              <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={handleAddContact}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </section>

          <Separator />

          {/* Updates */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Updates
            </h3>
            {updates.length > 0 && (
              <div className="space-y-2">
                {updates.map((u) => (
                  <div key={u.id} className="rounded-md border border-border bg-muted/30 p-2.5">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{u.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(u.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                placeholder="Add an update..."
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
                className="text-xs min-h-[60px]"
                maxLength={2000}
              />
            </div>
            <Button size="sm" onClick={handleAddUpdate} disabled={!newUpdate.trim()} className="gap-1">
              <Plus className="h-3 w-3" /> Add Update
            </Button>
          </section>

          <Separator />

          {/* Attachments */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Paperclip className="h-3 w-3" /> Attachments
            </h3>
            {attachments.length > 0 && (
              <div className="space-y-1.5">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between text-sm rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
                    <button onClick={() => handleDownloadAttachment(att)} className="text-foreground hover:text-primary truncate text-left transition-colors">
                      {att.file_name}
                      <span className="text-muted-foreground text-xs ml-1">({formatBytes(att.file_size)})</span>
                    </button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveAttachment(att)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm text-primary hover:underline">
                <Plus className="h-3 w-3" /> Upload file
                <input
                  type="file"
                  accept={FILE_EXTENSIONS}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[10px] text-muted-foreground mt-1">Max 25 MB. PDF, Office, images, CSV, TXT</p>
            </div>
          </section>

          <Separator />

          {/* Links */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Link2 className="h-3 w-3" /> Links
            </h3>
            {links.length > 0 && (
              <div className="space-y-1.5">
                {links.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-sm rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex items-center gap-1">
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      {l.label || l.url}
                    </a>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveLink(l)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input placeholder="URL" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} className="h-8 text-xs" />
              <Input placeholder="Label (optional)" value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} className="h-8 text-xs" />
              <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={handleAddLink}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </section>

          <Separator />

          {/* Relations */}
          <RelationsSection
            ownerRef={{ entityType: "task", entityId: task.id, title: task.title }}
            editable
          />

          <BacklinksPanel targetType="task" targetId={task.id} />

          <Separator />

          {/* Activity Trail */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <History className="h-3 w-3" /> Activity Trail
            </h3>
            {activity.length > 0 ? (
              <div className="space-y-1">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-xs py-1">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--entity-task)/0.7)]" />
                    <div>
                      <span className="text-foreground">{activityLabel(a)}</span>
                      <span className="text-muted-foreground ml-1.5">
                        {format(new Date(a.created_at), "MMM d 'at' h:mm a")}
                      </span>
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
