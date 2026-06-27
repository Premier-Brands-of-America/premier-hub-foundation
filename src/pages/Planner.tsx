/**
 * Planner page — Microsoft Teams Planner / Kanban board.
 * Project → Buckets → Tasks, with Planner-style cards and a board/grid view.
 */
import { PageHeader } from "@/components/PageHeader";
import { KanbanBoard } from "@/features/planner/KanbanBoard";

const PlannerPage = () => {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title="Planner"
        subtitle="Kanban board — organize work into buckets and move cards as they progress"
      />
      <div className="flex-1 overflow-hidden">
        <KanbanBoard />
      </div>
    </div>
  );
};

export default PlannerPage;
