import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isPreviewEnvironment } from "@/lib/environment";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WidgetConfig } from "../types";
import { CardLoading, CardError, CardEmpty } from "./card-states";

const IS_PREVIEW = isPreviewEnvironment();

interface TaskRow {
  id: string;
  title: string;
  due_date: string | null;
}

function isOverdue(due: string | null): boolean {
  if (!due) return false;
  return due < new Date().toISOString().split("T")[0];
}

export function MyOpenTasksCard({ config }: { config: WidgetConfig }) {
  const { user, profile } = useAuth();
  const userId = user?.id ?? profile?.user_id;
  const limit = config.limit ?? 6;
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["dashboard-card", "my-open-tasks", userId, limit],
    enabled: !!userId,
    queryFn: async (): Promise<TaskRow[]> => {
      if (IS_PREVIEW || !userId) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, due_date")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (query.isLoading) return <CardLoading />;
  if (query.isError) return <CardError onRetry={() => query.refetch()} />;

  const tasks = query.data ?? [];
  if (tasks.length === 0) {
    return (
      <CardEmpty
        message="No open tasks"
        hint="Tasks assigned to you will show up here."
        action={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/tasks")}
          >
            Go to Tasks <ArrowRight className="h-3 w-3" />
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-1">
      <ul className="space-y-0.5">
        {tasks.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => navigate("/tasks")}
              className="group flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left hover:bg-accent"
            >
              <Circle className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm text-foreground">{t.title}</span>
              {t.due_date && (
                <span
                  className={cn(
                    "shrink-0 text-xs tabular-nums",
                    isOverdue(t.due_date) ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {new Date(t.due_date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
