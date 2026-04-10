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
      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
        ${selected ? "border-primary/40 bg-primary/[0.03] shadow-sm" : "border-border hover:border-primary/20 bg-card"}
        ${isComplete ? "opacity-60" : ""}`}
      onClick={onSelect}
    >
      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isComplete}
          onCheckedChange={onToggleComplete}
          className="data-[state=checked]:bg-success data-[state=checked]:border-success"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isComplete ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {task.due_date && (
            <span className={`text-[11px] ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {overdue ? "Overdue · " : "Due "}
              {format(new Date(task.due_date), "MMM d")}
            </span>
          )}
          {task.percent_complete !== null && task.percent_complete > 0 && (
            <Badge variant="secondary" className="text-[10px] h-[18px] px-1.5 font-normal">
              {task.percent_complete}%
            </Badge>
          )}
          {isComplete && (
            <Badge className="text-[10px] h-[18px] px-1.5 bg-success/10 text-success border-0 font-normal">
              Done
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
