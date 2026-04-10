import type { Task } from "@/types/tasks";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format, isPast, isToday } from "date-fns";

interface TaskListItemProps {
  task: Task;
  selected: boolean;
  onSelect: () => void;
  onToggleComplete: () => void;
}

export function TaskListItem({ task, selected, onSelect, onToggleComplete }: TaskListItemProps) {
  const isComplete = task.status === "complete";
  const overdue = task.due_date && !isComplete && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
        ${selected ? "border-accent bg-accent/5" : "border-border hover:border-muted-foreground/30 bg-card"}
        ${isComplete ? "opacity-70" : ""}`}
      onClick={onSelect}
    >
      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isComplete}
          onCheckedChange={onToggleComplete}
          className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isComplete ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.due_date && (
            <span className={`text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {overdue ? "Overdue: " : "Due: "}
              {format(new Date(task.due_date), "MMM d, yyyy")}
            </span>
          )}
          {task.percent_complete !== null && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {task.percent_complete}%
            </Badge>
          )}
          {isComplete && (
            <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">
              Complete
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
