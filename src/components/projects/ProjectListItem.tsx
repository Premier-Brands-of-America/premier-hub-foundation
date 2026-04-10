import type { ProjectWithMeta } from "@/types/projects";
import { Badge } from "@/components/ui/badge";
import { format, isPast, isToday } from "date-fns";
import { Globe, Lock, Crown } from "lucide-react";

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

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
        ${selected ? "border-accent bg-accent/5" : "border-border hover:border-muted-foreground/30 bg-card"}
        ${isComplete ? "opacity-70" : ""}`}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${isComplete ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {project.title}
          </p>
          {project.visibility === "public" ? (
            <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
          ) : (
            <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {isOwner && (
            <Badge variant="outline" className="text-[10px] h-5 gap-0.5">
              <Crown className="h-2.5 w-2.5" /> Owner
            </Badge>
          )}
          {dueDate && (
            <span className={`text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {overdue ? "Overdue: " : "Due: "}{format(new Date(dueDate), "MMM d, yyyy")}
            </span>
          )}
          {project.overall_percent_complete !== null && (
            <Badge variant="secondary" className="text-[10px] h-5">{project.overall_percent_complete}%</Badge>
          )}
          {isComplete && (
            <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">Complete</Badge>
          )}
          {project.stakeholders && project.stakeholders.length > 1 && (
            <span className="text-xs text-muted-foreground">{project.stakeholders.length} stakeholders</span>
          )}
        </div>
      </div>
    </div>
  );
}
