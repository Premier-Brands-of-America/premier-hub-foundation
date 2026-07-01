/**
 * Planner page — Microsoft Teams Planner / Kanban board with a Board/Insights
 * toggle. Project → Buckets → Tasks, Planner-style cards, and live charts.
 *
 * Preview (localhost/.ts.net/DEV): demo board from localStorage (unchanged).
 * Production: reads/writes real Supabase data, scoped to a selected project.
 * The two paths use different hooks, so they live in separate child components
 * (React hook rules) chosen by the stable `IS_PREVIEW` module constant.
 */
import { useEffect, useState } from "react";
import { KanbanSquare, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KanbanBoard } from "@/features/planner/KanbanBoard";
import { PlannerCharts } from "@/features/planner/PlannerCharts";
import { usePlannerBoard } from "@/features/planner/usePlannerBoard";
import { usePlannerBoardSupabase } from "@/features/planner/usePlannerBoardSupabase";
import { usePlannerUsers } from "@/features/planner/usePlannerUsers";
import { useProjectsFlat } from "@/hooks/use-queries";
import { isPreviewEnvironment } from "@/lib/environment";

const IS_PREVIEW = isPreviewEnvironment();

type PlannerView = "board" | "insights";

function ViewTabs({ view, setView }: { view: PlannerView; setView: (v: PlannerView) => void }) {
  return (
    <Tabs value={view} onValueChange={(v) => setView(v as PlannerView)}>
      <TabsList>
        <TabsTrigger value="board">
          <KanbanSquare className="mr-1.5 h-4 w-4" /> Board
        </TabsTrigger>
        <TabsTrigger value="insights">
          <BarChart3 className="mr-1.5 h-4 w-4" /> Insights
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

/** Preview: demo board from localStorage (unchanged behavior). */
function DemoPlanner() {
  const controller = usePlannerBoard("demo-project");
  const [view, setView] = useState<PlannerView>("board");

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title="Planner"
        subtitle="Organize work into buckets, move cards as they progress, and track health"
        actions={<ViewTabs view={view} setView={setView} />}
      />
      <div className="flex-1 overflow-y-auto">
        {view === "board" ? (
          <KanbanBoard controller={controller} />
        ) : (
          <div className="p-4">
            <PlannerCharts board={controller.board} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Production: real Supabase data for a single selected project. Owns the live
 * controller (so the hook runs unconditionally) and renders board or insights.
 */
function LivePlanner({ projectId, view }: { projectId: string; view: PlannerView }) {
  const controller = usePlannerBoardSupabase(projectId);
  const users = usePlannerUsers();

  if (view === "insights") return <PlannerCharts board={controller.board} />;
  return <KanbanBoard controller={controller} users={users} showReset={false} />;
}

function ProductionPlanner() {
  const { projects, isLoading } = useProjectsFlat();
  const [view, setView] = useState<PlannerView>("board");
  const [projectId, setProjectId] = useState<string>("");

  // Default to the first project once loaded.
  useEffect(() => {
    if (!projectId && projects.length) setProjectId(projects[0].id);
  }, [projectId, projects]);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title="Planner"
        subtitle="Organize work into buckets, move cards as they progress, and track health"
        actions={
          <div className="flex items-center gap-3">
            {projects.length > 0 ? (
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <ViewTabs view={view} setView={setView} />
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading projects…</p>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No projects yet. Create a project first, then organize its work here.
          </div>
        ) : !projectId ? null : (
          <LivePlanner projectId={projectId} view={view} />
        )}
      </div>
    </div>
  );
}

const PlannerPage = () => (IS_PREVIEW ? <DemoPlanner /> : <ProductionPlanner />);

export default PlannerPage;
