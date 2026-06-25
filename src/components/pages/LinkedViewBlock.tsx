import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Folder, LayoutList, AlertTriangle } from "lucide-react";
import { useTasksFlat, useProjectsFlat } from "@/hooks/use-queries";

interface ViewConfig {
  source: "tasks" | "projects";
  filter?: string;
  title?: string;
}

const MAX_ROWS = 8;

function parseConfig(raw: string): ViewConfig | null {
  try {
    const c = JSON.parse(raw.trim());
    if (c && (c.source === "tasks" || c.source === "projects")) return c as ViewConfig;
  } catch {
    /* fall through */
  }
  return null;
}

/** Read-only "linked view" — a live filtered list of tasks/projects embedded in a page. */
export function LinkedViewBlock({ raw }: { raw: string }) {
  const config = parseConfig(raw);
  if (!config) return <BlockError />;
  return config.source === "tasks" ? <TasksView config={config} /> : <ProjectsView config={config} />;
}

function BlockError() {
  return (
    <Card className="not-prose my-3 border-dashed">
      <CardContent className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5" /> Invalid embed config.
      </CardContent>
    </Card>
  );
}

function Shell({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="not-prose my-3">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          {title}
        </CardTitle>
        <Badge variant="secondary">{count}</Badge>
      </CardHeader>
      <CardContent className="space-y-1">{children}</CardContent>
    </Card>
  );
}

function Empty() {
  return <p className="text-xs text-muted-foreground py-1">Nothing matches this view.</p>;
}

function TasksView({ config }: { config: ViewConfig }) {
  const navigate = useNavigate();
  const { tasks, isLoading } = useTasksFlat();

  const rows = useMemo(() => {
    const now = Date.now();
    let list = tasks;
    if (config.filter === "open") list = list.filter((t) => t.status === "active");
    else if (config.filter === "overdue")
      list = list.filter((t) => t.status === "active" && t.due_date && new Date(t.due_date).getTime() < now);
    return list.slice(0, MAX_ROWS);
  }, [tasks, config.filter]);

  return (
    <Shell title={config.title || "Tasks"} icon={LayoutList} count={rows.length}>
      {isLoading && <p className="text-xs text-muted-foreground py-1">Loading…</p>}
      {!isLoading && rows.length === 0 && <Empty />}
      {rows.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => navigate("/tasks")}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent/50 transition"
        >
          <CheckSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">{t.title}</span>
          {t.status === "complete" && <Badge variant="outline" className="text-[10px]">done</Badge>}
        </button>
      ))}
    </Shell>
  );
}

function ProjectsView({ config }: { config: ViewConfig }) {
  const navigate = useNavigate();
  const { projects, isLoading } = useProjectsFlat();

  const rows = useMemo(() => {
    let list = projects;
    if (config.filter === "active") list = list.filter((p) => p.status === "active");
    return list.slice(0, MAX_ROWS);
  }, [projects, config.filter]);

  return (
    <Shell title={config.title || "Projects"} icon={Folder} count={rows.length}>
      {isLoading && <p className="text-xs text-muted-foreground py-1">Loading…</p>}
      {!isLoading && rows.length === 0 && <Empty />}
      {rows.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => navigate("/owned-projects")}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent/50 transition"
        >
          <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">{p.title}</span>
          {typeof p.overall_percent_complete === "number" && (
            <span className="text-[11px] text-muted-foreground">{p.overall_percent_complete}%</span>
          )}
        </button>
      ))}
    </Shell>
  );
}
