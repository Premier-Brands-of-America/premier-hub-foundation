/**
 * Planner-style Kanban card. Draggable via native HTML5 DnD.
 */
import { MessageSquare, Paperclip, ListChecks, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DueDateBadge } from "@/components/common/DueDateBadge";
import { cn } from "@/lib/utils";
import type { PlannerCard, CardPriority } from "./types";

const PRIORITY_DOT: Record<CardPriority, string> = {
  low: "bg-slate-400",
  medium: "bg-sky-500",
  high: "bg-amber-500",
  urgent: "bg-destructive",
};

const KIND_LABEL: Record<PlannerCard["kind"], string> = {
  task: "Task",
  request: "Art Request",
  project: "Project",
};

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

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
  return (
    <article
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className="group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span className={cn("h-2 w-2 rounded-full", PRIORITY_DOT[card.priority])} />
          {KIND_LABEL[card.kind]}
        </span>
        {card.customer && (
          <span className="truncate rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {card.customer}
          </span>
        )}
      </div>

      <h4 className="mb-2 line-clamp-2 text-sm font-medium leading-snug">
        {card.title}
      </h4>

      {card.dueDate && (
        <div className="mb-2">
          <DueDateBadge due={card.dueDate} />
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {card.checklist.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <ListChecks className="h-3.5 w-3.5" />
            {doneCount}/{card.checklist.length}
          </span>
        )}
        {card.attachments.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <Paperclip className="h-3.5 w-3.5" />
            {card.attachments.length}
          </span>
        )}
        {card.comments.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {card.comments.length}
          </span>
        )}
        {card.meetingRequired && (
          <span className="inline-flex items-center gap-1 text-primary">
            <Users className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="ml-auto">
          {card.assigneeName && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">
                {initials(card.assigneeName)}
              </AvatarFallback>
            </Avatar>
          )}
        </span>
      </div>
    </article>
  );
}
