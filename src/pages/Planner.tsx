/**
 * Planner page — Microsoft Teams Planner / Kanban board with a Board/Insights
 * toggle. Project → Buckets → Tasks, Planner-style cards, and live charts.
 */
import { useState } from "react";
import { KanbanSquare, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanBoard } from "@/features/planner/KanbanBoard";
import { PlannerCharts } from "@/features/planner/PlannerCharts";
import { usePlannerBoard } from "@/features/planner/usePlannerBoard";

const PlannerPage = () => {
  const controller = usePlannerBoard("demo-project");
  const [view, setView] = useState<"board" | "insights">("board");

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title="Planner"
        subtitle="Organize work into buckets, move cards as they progress, and track health"
        actions={
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList>
              <TabsTrigger value="board">
                <KanbanSquare className="mr-1.5 h-4 w-4" /> Board
              </TabsTrigger>
              <TabsTrigger value="insights">
                <BarChart3 className="mr-1.5 h-4 w-4" /> Insights
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
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
};

export default PlannerPage;
