import type { ProjectWithMeta } from "@/types/projects";
import { Badge } from "@/components/ui/badge";
import { format, isPast, isToday } from "date-fns";
import { Globe, Lock, Crown, Users } from "lucide-react";

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

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
        ${selected ? "border-primary/40 bg-primary/[0.03] shadow-sm" : "border-border hover:border-primary/20 bg-card"}
        ${isComplete ? "opacity-60" : ""}`}
      onClick={onSelect}
    >
      <div className="pt-0.5 shrink-0">
        {project.visibility === "public" ? (
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isComplete ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {project.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {isOwner && (
            <Badge variant="outline" className="text-[10px] h-[18px] px-1.5 gap-0.5 font-normal">
              <Crown className="h-2.5 w-2.5" /> Owner
            </Badge>
          )}
          {dueDate && (
            <span className={`text-[11px] ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {overdue ? "Overdue · " : "Due "}
              {format(new Date(dueDate), "MMM d")}
            </span>
          )}
          {project.overall_percent_complete !== null && project.overall_percent_complete > 0 && (
            <Badge variant="secondary" className="text-[10px] h-[18px] px-1.5 font-normal">
              {project.overall_percent_complete}%
            </Badge>
          )}
          {isComplete && (
            <Badge className="text-[10px] h-[18px] px-1.5 bg-success/10 text-success border-0 font-normal">
              Done
            </Badge>
          )}
          {stakeholderCount > 1 && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
              <Users className="h-3 w-3" /> {stakeholderCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
