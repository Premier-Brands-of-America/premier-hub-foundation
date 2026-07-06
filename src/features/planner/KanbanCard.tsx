/**
 * Planner-style Kanban card. Draggable via native HTML5 DnD.
 *
 * Card anatomy (mirrors the board mockup): a type tag with a priority-tinted
 * dot, a brand/customer chip, the title, a due chip (vermilion overdue / amber
 * soon / neutral — suppressed entirely once the card is completed, since done
 * work never alarms), then a footer of checklist · attachments · comments · a
 * "sent" timestamp for approver-stage cards, and the assignee avatar.
 */
import { useState } from "react";
import { MessageSquare, Paperclip, ListChecks, Users, Check } from "lucide-react";
import { EntityAvatar } from "@/components/common/EntityAvatar";
import { DueDateBadge } from "@/components/common/DueDateBadge";
import { cn } from "@/lib/utils";
import { PRIORITY_LABEL } from "./plannerFilters";
import type { PlannerCard, CardPriority } from "./types";

// Priority dots use the semantic --priority-* tokens (never the brand accent).
const PRIORITY_TOKEN: Record<CardPriority, string> = {
  low: "--priority-low",
  medium: "--priority-medium",
  high: "--priority-high",
  urgent: "--priority-urgent",
};

const KIND_LABEL: Record<PlannerCard["kind"], string> = {
  task: "Task",
  request: "Art Request",
  project: "Project",
};

export function KanbanCard({
  card,
  onOpen,
  onDragStart,
}: {
  card: PlannerCard;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const doneCount = card.checklist.filter((i) => i.done).length;
  const checklistTotal = card.checklist.length;
  const checklistComplete = checklistTotal > 0 && doneCount === checklistTotal;
  const isDone = card.status === "completed";
  const [dragging, setDragging] = useState(false);
  const priorityToken = PRIORITY_TOKEN[card.priority];

  return (
    <article
      draggable
      onDragStart={(e) => {
        setDragging(true);
        onDragStart(e);
      }}
      onDragEnd={() => setDragging(false)}
      onClick={onOpen}
      className={cn(
        "group flex cursor-pointer flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:-translate-y-px hover:border-border/80 hover:shadow-md",
        dragging && "opacity-50 ring-2 ring-primary",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: `hsl(var(${priorityToken}))` }}
            aria-hidden
          />
          {KIND_LABEL[card.kind]}
        </span>
        <span
          className="ml-auto shrink-0 text-[11px] font-medium capitalize"
          style={{ color: `hsl(var(${priorityToken}))` }}
        >
          {PRIORITY_LABEL[card.priority]}
        </span>
      </div>

      <h4 className="line-clamp-2 text-sm font-medium leading-snug">{card.title}</h4>

      {(card.customer || (card.dueDate && !isDone)) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {card.customer && (
            <span className="truncate rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {card.customer}
            </span>
          )}
          {/* Done work is done — a completed card never alarms as overdue. */}
          {card.dueDate && !isDone && <DueDateBadge due={card.dueDate} className="ml-auto" />}
        </div>
      )}

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        {checklistTotal > 0 && (
          <span
            className={cn("inline-flex items-center gap-1 tabular-nums", checklistComplete && "text-success")}
          >
            {checklistComplete ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <ListChecks className="h-3.5 w-3.5" />
            )}
            {doneCount}/{checklistTotal}
          </span>
        )}
        {card.attachments.length > 0 && (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Paperclip className="h-3.5 w-3.5" />
            {card.attachments.length}
          </span>
        )}
        {card.comments.length > 0 && (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <MessageSquare className="h-3.5 w-3.5" />
            {card.comments.length}
          </span>
        )}
        {card.meetingRequired && (
          <span className="inline-flex items-center gap-1 text-primary" title="Meeting required">
            <Users className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="ml-auto">
          {card.assigneeName && (
            <EntityAvatar
              type="user"
              seed={card.assigneeId ?? card.assigneeName ?? "u"}
              name={card.assigneeName}
              size="sm"
            />
          )}
        </span>
      </div>
    </article>
  );
}
