import { useState, useMemo } from "react";
import { Plus, SlidersHorizontal, ClipboardList, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTasksFlat } from "@/hooks/use-queries";
import { useRealtimeInvalidation } from "@/hooks/use-realtime";
import { TaskListSkeleton } from "@/components/tasks/TaskListSkeleton";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import type { Task } from "@/types/tasks";
import * as taskService from "@/services/taskService";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { TaskListItem } from "@/components/tasks/TaskListItem";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { useQueryClient } from "@tanstack/react-query";

type SortOption = "newest" | "oldest" | "due_date" | "title";
type FilterOption = "all" | "active" | "complete";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "due_date", label: "Due Date" },
  { value: "title", label: "Title" },
];

const TasksPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const userId = user?.id ?? profile?.user_id ?? "";
  const queryClient = useQueryClient();

  const { tasks, total, isLoading: loading, hasNextPage, fetchNextPage, isFetchingNextPage } = useTasksFlat();
  useRealtimeInvalidation("tasks", ["tasks"]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [filter, setFilter] = useState<FilterOption>("all");

  const invalidateTasks = () => queryClient.invalidateQueries({ queryKey: ["tasks"] });

  const handleCreate = async (input: { title: string; description?: string; due_date?: string; percent_complete?: number | null }) => {
    await taskService.createTask(userId, input);
    invalidateTasks();
    toast({ title: "Task created" });
  };

  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === "active" ? "complete" : "active";
    await taskService.updateTask(userId, task.id, { status: newStatus }, task);
    invalidateTasks();
  };

  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId) ?? null, [tasks, selectedTaskId]);

  const filteredAndSorted = useMemo(() => {
    let result = [...tasks];
    if (filter === "active") result = result.filter((t) => t.status === "active");
    if (filter === "complete") result = result.filter((t) => t.status === "complete");

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    switch (sort) {
      case "newest": result.sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
      case "oldest": result.sort((a, b) => a.created_at.localeCompare(b.created_at)); break;
      case "due_date":
        result.sort((a, b) => {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date.localeCompare(b.due_date);
        });
        break;
      case "title": result.sort((a, b) => a.title.localeCompare(b.title)); break;
    }

    return result;
  }, [tasks, filter, search, sort]);

  const counts = useMemo(() => ({
    all: tasks.length,
    active: tasks.filter((t) => t.status === "active").length,
    complete: tasks.filter((t) => t.status === "complete").length,
  }), [tasks]);

  const handleSelect = (id: string) => {
    setSelectedTaskId(id === selectedTaskId ? null : id);
  };

  const remaining = total - tasks.length;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className={`flex flex-col ${selectedTask ? "hidden md:flex md:w-1/2 xl:w-3/5" : "w-full"} transition-all`}>
        <div className="px-4 sm:px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">
                My Tasks {total > 0 && <span className="text-muted-foreground font-normal">({total})</span>}
              </h1>
              <p className="text-xs text-muted-foreground">
                {counts.active} active · {counts.complete} complete
              </p>
            </div>
            <Button onClick={() => setShowCreate(true)} className="gap-2" size="sm">
              <Plus className="h-3.5 w-3.5" /> New Task
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <SearchFilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search tasks..."
              sortValue={sort}
              onSortChange={(v) => setSort(v as SortOption)}
              sortOptions={SORT_OPTIONS}
            >
              <Select value={filter} onValueChange={(v) => setFilter(v as FilterOption)}>
                <SelectTrigger className="w-[110px] h-8 text-xs" aria-label="Filter by status">
                  <SlidersHorizontal className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({counts.all})</SelectItem>
                  <SelectItem value="active">Active ({counts.active})</SelectItem>
                  <SelectItem value="complete">Done ({counts.complete})</SelectItem>
                </SelectContent>
              </Select>
            </SearchFilterBar>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5">
          {loading ? (
            <TaskListSkeleton />
          ) : filteredAndSorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <ClipboardList className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                {search ? "No matching tasks" : filter !== "all" ? `No ${filter} tasks` : "No tasks yet"}
              </p>
              <p className="text-xs text-muted-foreground mb-3 max-w-[240px]">
                {search ? "Try a different search term." : "Create your first task to get started."}
              </p>
              {!search && filter === "all" && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
                  <Plus className="h-3 w-3" /> Create Task
                </Button>
              )}
            </div>
          ) : (
            <>
              {filteredAndSorted.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  selected={task.id === selectedTaskId}
                  onSelect={() => handleSelect(task.id)}
                  onToggleComplete={() => handleToggleComplete(task)}
                />
              ))}
              {hasNextPage && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="gap-2"
                  >
                    {isFetchingNextPage ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...</>
                    ) : (
                      `Load more (${remaining} remaining)`
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selectedTask && (
        <div className="w-full md:w-1/2 xl:w-2/5 border-l border-border">
          <TaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTaskId(null)}
            onTaskUpdated={invalidateTasks}
          />
        </div>
      )}

      <CreateTaskModal open={showCreate} onOpenChange={setShowCreate} onSubmit={handleCreate} />
    </div>
  );
};

export default TasksPage;
