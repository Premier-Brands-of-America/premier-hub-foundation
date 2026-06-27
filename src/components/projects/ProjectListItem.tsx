import type { ProjectWithMeta } from "@/types/projects";
import { Badge } from "@/components/ui/badge";
import { format, isPast, isToday } from "date-fns";
import { Globe, Lock, Crown, Users, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { DueDateBadge } from "@/components/common/DueDateBadge";

interface ProjectListItemProps {
  project: ProjectWithMeta;
  selected: boolean;
  onSelect: () => void;
  currentUserId: string;
}

export function ProjectListItem({ project, selected, onSelect, currentUserId }: ProjectListItemProps) {
  const isComplete = project.status === "complete";
  const dueDate = project.updated_due_date || project.desired_due_date;
  const overdue = dueDate && !isComplete && isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
  const isOwner = project.owner_id === currentUserId;
  const stakeholderCount = project.stakeholders?.length ?? 0;
  const percent = project.overall_percent_complete;
  const showProgress = percent !== null && percent > 0;

  return (
    <div
      data-state={selected ? "selected" : undefined}
      className={cn(
        "group relative flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer",
        "transition-colors duration-fast ease-standard outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        selected
          ? "border-primary/30 bg-primary/[0.05] shadow-[inset_2px_0_0_0_hsl(var(--primary))]"
          : "border-border bg-card hover:border-border hover:bg-accent/40",
        isComplete && "opacity-70",
      )}
      onClick={onSelect}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`${project.title}${isComplete ? " (completed)" : ""}${overdue ? " (overdue)" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="pt-0.5 shrink-0 text-[hsl(var(--entity-project))]">
        {project.visibility === "public" ? (
          <Globe className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Lock className="h-3.5 w-3.5" aria-hidden />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "truncate text-sm font-medium",
              isComplete ? "text-muted-foreground line-through" : "text-foreground",
            )}
          >
            {project.title}
          </p>
          {isOwner && (
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Crown className="h-2.5 w-2.5" /> Owner
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {dueDate && !isComplete && <DueDateBadge due={dueDate} />}
          {dueDate && isComplete && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
              <CalendarClock className="h-3 w-3" />
              {format(new Date(dueDate), "MMM d")}
            </span>
          )}
          {showProgress && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums">
              <span className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-[hsl(var(--entity-project))]"
                  style={{ width: `${percent}%` }}
                />
              </span>
              {percent}%
            </span>
          )}
          {stakeholderCount > 1 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
              <Users className="h-3 w-3" /> {stakeholderCount}
            </span>
          )}
        </div>
      </div>

      {isComplete && (
        <span className="shrink-0 rounded-full border border-transparent bg-[hsl(var(--status-done)/0.14)] px-2.5 py-0.5 text-[11px] font-medium text-[hsl(var(--status-done))]">
          Done
        </span>
      )}
    </div>
  );
}
