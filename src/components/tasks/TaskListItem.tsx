import type { Task } from "@/types/tasks";
import { Checkbox } from "@/components/ui/checkbox";
import { format, isPast, isToday } from "date-fns";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { DueDateBadge } from "@/components/common/DueDateBadge";

interface TaskListItemProps {
  task: Task;
  selected: boolean;
  onSelect: () => void;
  onToggleComplete: () => void;
}

export function TaskListItem({ task, selected, onSelect, onToggleComplete }: TaskListItemProps) {
  const isComplete = task.status === "complete";
  const overdue =
    task.due_date && !isComplete && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
  const showProgress = task.percent_complete !== null && task.percent_complete > 0;

  return (
    <div
      data-state={selected ? "selected" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer",
        "transition-colors duration-fast ease-standard outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        selected
          ? "border-primary/30 bg-primary/[0.05] shadow-[inset_2px_0_0_0_hsl(var(--primary))]"
          : "border-border bg-card hover:border-border hover:bg-accent/40",
      )}
      onClick={onSelect}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`${task.title}${isComplete ? " (completed)" : ""}${overdue ? " (overdue)" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="pt-px" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isComplete}
          onCheckedChange={onToggleComplete}
          aria-label={isComplete ? "Mark task active" : "Mark task complete"}
          className="data-[state=checked]:bg-[hsl(var(--status-done))] data-[state=checked]:border-[hsl(var(--status-done))]"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            isComplete ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {task.title}
        </p>

        {(task.due_date || showProgress) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {task.due_date && !isComplete && <DueDateBadge due={task.due_date} />}
            {task.due_date && isComplete && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
                <CalendarClock className="h-3 w-3" />
                {format(new Date(task.due_date), "MMM d")}
              </span>
            )}
            {showProgress && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums">
                <span className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-[hsl(var(--entity-task))]"
                    style={{ width: `${task.percent_complete}%` }}
                  />
                </span>
                {task.percent_complete}%
              </span>
            )}
          </div>
        )}
      </div>

      {isComplete && (
        <span className="shrink-0 rounded-full border border-transparent bg-[hsl(var(--status-done)/0.14)] px-2.5 py-0.5 text-[11px] font-medium text-[hsl(var(--status-done))]">
          Done
        </span>
      )}
    </div>
  );
}
