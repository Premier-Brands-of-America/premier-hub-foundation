import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTask } from "@/services/taskService";
import { fetchProject } from "@/services/projectService";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { ProjectDetailPanel } from "@/components/projects/ProjectDetailPanel";
import type { Task } from "@/types/tasks";
import type { ProjectWithMeta } from "@/types/projects";
import type { TimelineEntityType } from "@/types/timeline";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entity: { type: TimelineEntityType; id: string } | null;
  onUpdated?: () => void;
}

export function EntityDetailSheet({ open, onOpenChange, entity, onUpdated }: Props) {
  const [task, setTask] = useState<Task | null>(null);
  const [project, setProject] = useState<ProjectWithMeta | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !entity) return;
    setTask(null); setProject(null); setLoading(true);
    (async () => {
      try {
        if (entity.type === "task") {
          setTask(await fetchTask(entity.id));
        } else if (entity.type === "project") {
          setProject(await fetchProject(entity.id));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [open, entity]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {entity ? entity.type.charAt(0).toUpperCase() + entity.type.slice(1) : "Details"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
          {!loading && entity?.type === "task" && task && (
            <TaskDetailPanel
              task={task}
              onClose={() => onOpenChange(false)}
              onTaskUpdated={() => onUpdated?.()}
            />
          )}
          {!loading && entity?.type === "project" && project && (
            <ProjectDetailPanel
              project={project}
              onClose={() => onOpenChange(false)}
              onProjectUpdated={() => onUpdated?.()}
            />
          )}
          {!loading && entity?.type === "request" && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Open this request to see its full details and activity.</p>
              <Button asChild>
                <Link to={`/requests/${entity.id}`}>
                  Open request
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
          {!loading && entity && entity.type !== "request" && !task && !project && (
            <p className="text-sm text-muted-foreground">We couldn&apos;t load this item. It may have been moved or deleted.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}