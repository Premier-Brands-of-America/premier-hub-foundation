import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isPreviewEnvironment } from "@/lib/environment";
import { Button } from "@/components/ui/button";
import type { WidgetConfig } from "../types";
import { CardLoading, CardError, CardEmpty } from "./card-states";

const IS_PREVIEW = isPreviewEnvironment();

/** Map a project status to a semantic status token (theme-aware HSL var). */
const STATUS_TOKEN: Record<string, string> = {
  active: "var(--status-in-progress)",
  in_progress: "var(--status-in-progress)",
  completed: "var(--status-done)",
  complete: "var(--status-done)",
  blocked: "var(--status-blocked)",
  on_hold: "var(--status-warning)",
  archived: "var(--status-neutral)",
};

function tokenFor(status: string): string {
  return STATUS_TOKEN[status] ?? "var(--status-neutral)";
}

function prettyStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ProjectRollupCard({ config }: { config: WidgetConfig }) {
  const { user, profile } = useAuth();
  const userId = user?.id ?? profile?.user_id;
  const scope = config.scope === "assigned" ? "assigned" : "owned";
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["dashboard-card", "project-rollup", scope, userId],
    enabled: !!userId,
    queryFn: async (): Promise<Record<string, number>> => {
      if (IS_PREVIEW || !userId) return {};
      let statuses: string[] = [];
      if (scope === "owned") {
        const { data, error } = await supabase
          .from("projects")
          .select("status")
          .eq("owner_id", userId);
        if (error) throw error;
        statuses = (data ?? []).map((r) => r.status);
      } else {
        const { data: sh, error: shErr } = await supabase
          .from("project_stakeholders")
          .select("project_id")
          .eq("user_id", userId);
        if (shErr) throw shErr;
        const ids = (sh ?? []).map((s) => s.project_id);
        if (ids.length === 0) return {};
        const { data, error } = await supabase
          .from("projects")
          .select("status")
          .in("id", ids);
        if (error) throw error;
        statuses = (data ?? []).map((r) => r.status);
      }
      return statuses.reduce<Record<string, number>>((acc, s) => {
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
      }, {});
    },
  });

  if (query.isLoading) return <CardLoading />;
  if (query.isError) return <CardError onRetry={() => query.refetch()} />;

  const counts = query.data ?? {};
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  const target = scope === "owned" ? "/owned-projects" : "/assigned-projects";

  if (total === 0) {
    return (
      <CardEmpty
        message={scope === "owned" ? "No projects yet" : "No assigned projects"}
        hint={
          scope === "owned"
            ? "Projects you own will roll up here."
            : "Projects where you're a stakeholder will roll up here."
        }
        action={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate(target)}
          >
            View Projects <ArrowRight className="h-3 w-3" />
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="stat-numeral text-3xl leading-none text-foreground">{total}</span>
        <span className="text-xs text-muted-foreground">
          {scope === "owned" ? "owned" : "assigned"} project{total !== 1 ? "s" : ""}
        </span>
      </div>
      <ul className="space-y-1.5">
        {entries.map(([status, n]) => (
          <li key={status} className="flex items-center gap-2 text-sm">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: `hsl(${tokenFor(status)})` }}
            />
            <span className="flex-1 truncate text-muted-foreground">{prettyStatus(status)}</span>
            <span className="tabular-nums text-foreground">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
