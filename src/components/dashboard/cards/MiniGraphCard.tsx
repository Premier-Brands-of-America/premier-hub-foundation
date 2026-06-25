import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isPreviewEnvironment } from "@/lib/environment";
import { Button } from "@/components/ui/button";
import { CardLoading, CardError } from "./card-states";

const IS_PREVIEW = isPreviewEnvironment();

/**
 * Compact relations overview. The full force-directed graph is owned by the
 * GRAPH route (role-gated, heavy `react-force-graph-2d`); this widget shows a
 * dependency-free summary (entity counts + a small constellation) and links
 * through to it. See P4 note: deliberately NOT rendering the heavy graph here.
 */

interface Counts {
  projects: number;
  tasks: number;
  pages: number;
}

const NODES: Array<{ key: keyof Counts; label: string; token: string }> = [
  { key: "projects", label: "Projects", token: "var(--entity-project)" },
  { key: "tasks", label: "Tasks", token: "var(--entity-task)" },
  { key: "pages", label: "Pages", token: "var(--entity-page)" },
];

export function MiniGraphCard() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const canOpenGraph = role === "admin" || role === "designer";

  const query = useQuery({
    queryKey: ["dashboard-card", "mini-graph-counts"],
    queryFn: async (): Promise<Counts> => {
      if (IS_PREVIEW) return { projects: 0, tasks: 0, pages: 0 };
      const [proj, task, page] = await Promise.all([
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }),
        supabase.from("pages").select("id", { count: "exact", head: true }),
      ]);
      if (proj.error) throw proj.error;
      if (task.error) throw task.error;
      if (page.error) throw page.error;
      return {
        projects: proj.count ?? 0,
        tasks: task.count ?? 0,
        pages: page.count ?? 0,
      };
    },
  });

  if (query.isLoading) return <CardLoading rows={2} />;
  if (query.isError) return <CardError onRetry={() => query.refetch()} />;

  const counts = query.data ?? { projects: 0, tasks: 0, pages: 0 };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {/* Decorative constellation, theme-aware via entity tokens */}
        <svg viewBox="0 0 64 48" className="h-12 w-16 shrink-0" aria-hidden="true">
          <line x1="14" y1="24" x2="40" y2="12" stroke="hsl(var(--border))" strokeWidth="1.5" />
          <line x1="14" y1="24" x2="40" y2="36" stroke="hsl(var(--border))" strokeWidth="1.5" />
          <line x1="40" y1="12" x2="40" y2="36" stroke="hsl(var(--border))" strokeWidth="1.5" />
          <circle cx="14" cy="24" r="6" fill="hsl(var(--entity-project))" />
          <circle cx="40" cy="12" r="4.5" fill="hsl(var(--entity-task))" />
          <circle cx="40" cy="36" r="4.5" fill="hsl(var(--entity-page))" />
        </svg>
        <ul className="flex-1 space-y-1">
          {NODES.map((n) => (
            <li key={n.key} className="flex items-center gap-2 text-sm">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: `hsl(${n.token})` }}
              />
              <span className="flex-1 text-muted-foreground">{n.label}</span>
              <span className="tabular-nums text-foreground">{counts[n.key]}</span>
            </li>
          ))}
        </ul>
      </div>
      {canOpenGraph && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/graph")}
        >
          <Share2 className="h-3 w-3" /> Open graph <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
