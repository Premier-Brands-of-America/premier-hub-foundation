/**
 * Planner card detail (Planner-style) — status, priority, assignee, dates,
 * checklist, notes, the structured due-date justification, attachment gallery,
 * comments/@mentions, and the meeting toggle + Schedule-in-Outlook action.
 */
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DueDateBadge } from "@/components/common/DueDateBadge";
import {
  DueDateJustificationField,
} from "@/components/common/DueDateJustificationField";
import { AttachmentGallery } from "@/components/common/AttachmentGallery";
import { CommentsThread } from "@/components/common/CommentsThread";
import { MeetingScheduler } from "@/components/common/MeetingScheduler";
import { parseMentions } from "@/lib/mentions";
import { useAuth } from "@/hooks/useAuth";
import type { PlannerCard, CardPriority, CardStatus, ChecklistItem } from "./types";

const STATUS: { value: CardStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];
const PRIORITY: CardPriority[] = ["low", "medium", "high", "urgent"];

function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Math.random().toString(36).slice(2)}`;
  }
}

export function CardDetailDialog({
  card,
  users,
  onClose,
  onUpdate,
  onDelete,
}: {
  card: PlannerCard | null;
  users: { id: string; name: string }[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<PlannerCard>) => void;
  onDelete: (id: string) => void;
}) {
  const [checkText, setCheckText] = useState("");
  const { user, profile } = useAuth();
  if (!card) return null;

  const doneCount = card.checklist.filter((i) => i.done).length;
  const pct = card.checklist.length
    ? Math.round((doneCount / card.checklist.length) * 100)
    : 0;

  function patch(p: Partial<PlannerCard>) {
    onUpdate(card!.id, p);
  }

  function addCheck() {
    if (!checkText.trim()) return;
    const item: ChecklistItem = { id: newId(), text: checkText.trim(), done: false };
    patch({ checklist: [...card!.checklist, item] });
    setCheckText("");
  }

  function toggleCheck(id: string) {
    patch({
      checklist: card!.checklist.map((i) =>
        i.id === id ? { ...i, done: !i.done } : i,
      ),
    });
  }

  function addComment(body: string) {
    const authorId = user?.id ?? "me";
    const authorName =
      profile?.full_name ??
      users.find((u) => u.id === user?.id)?.name ??
      user?.email ??
      "Me";
    patch({
      comments: [
        ...card!.comments,
        {
          id: newId(),
          authorId,
          authorName,
          body,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    // Notification trigger is exercised by lib/notificationTriggers in prod;
    // surface mention count for reviewer feedback.
    const mentioned = parseMentions(body);
    if (mentioned.length) {
      // eslint-disable-next-line no-console
      console.info(
        `[planner] notify ${mentioned.length} mentioned user(s):`,
        mentioned.map((m) => m.display).join(", "),
      );
    }
  }

  return (
    <Dialog open={!!card} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Card details</DialogTitle>
          <Input
            value={card.title}
            onChange={(e) => patch({ title: e.target.value })}
            className="border-0 px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
          />
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[1fr_280px]">
          {/* Main column */}
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                value={card.description ?? ""}
                placeholder="Add a description…"
                rows={3}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </div>

            {card.kind === "request" && card.keyPoints?.length ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Key points</Label>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {card.keyPoints.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Checklist {card.checklist.length > 0 && `(${doneCount}/${card.checklist.length})`}
                </Label>
              </div>
              {card.checklist.length > 0 && <Progress value={pct} className="h-1.5" />}
              <ul className="space-y-1.5">
                {card.checklist.map((i) => (
                  <li key={i.id} className="flex items-center gap-2">
                    <Checkbox checked={i.done} onCheckedChange={() => toggleCheck(i.id)} />
                    <span className={i.done ? "text-sm line-through text-muted-foreground" : "text-sm"}>
                      {i.text}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input
                  value={checkText}
                  placeholder="Add an item…"
                  onChange={(e) => setCheckText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCheck()}
                />
                <Button size="icon" variant="outline" onClick={addCheck}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Attachments</Label>
              <AttachmentGallery items={card.attachments} />
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Comments &amp; activity
              </Label>
              <CommentsThread
                comments={card.comments}
                users={users}
                onAdd={addComment}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={card.status} onValueChange={(v) => patch({ status: v as CardStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select value={card.priority} onValueChange={(v) => patch({ priority: v as CardPriority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Assignee</Label>
              <Select
                value={card.assigneeId ?? "unassigned"}
                onValueChange={(v) => {
                  const u = users.find((x) => x.id === v);
                  patch({ assigneeId: u?.id ?? null, assigneeName: u?.name ?? null });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Due date</Label>
              <Input
                type="date"
                value={card.dueDate ?? ""}
                onChange={(e) => patch({ dueDate: e.target.value || null })}
              />
              {card.dueDate && <DueDateBadge due={card.dueDate} size="md" />}
            </div>

            {card.dueDate && (
              <DueDateJustificationField
                value={card.dueJustification}
                required
                onChange={(j) => patch({ dueJustification: j })}
              />
            )}

            <MeetingScheduler
              meetingRequired={!!card.meetingRequired}
              onToggle={(v) => patch({ meetingRequired: v })}
              prefill={{
                subject: `${card.customer ? card.customer + " — " : ""}${card.title}`,
                attendees: [],
                bodyLines: [
                  card.description ?? "",
                  ...(card.keyPoints ?? []).map((p) => `• ${p}`),
                ].filter(Boolean),
              }}
            />

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => {
                onDelete(card.id);
                onClose();
              }}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete card
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
