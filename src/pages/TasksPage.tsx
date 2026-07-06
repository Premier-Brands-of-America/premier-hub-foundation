import { useState, useMemo } from "react";
import { Plus, ClipboardList, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTasksFlat } from "@/hooks/use-queries";
import { useRealtimeInvalidation } from "@/hooks/use-realtime";
import { TaskListSkeleton } from "@/components/tasks/TaskListSkeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/PageHeader";
import type { Task } from "@/types/tasks";
import * as taskService from "@/services/taskService";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { TaskListItem } from "@/components/tasks/TaskListItem";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type SortOption = "newest" | "oldest" | "due_date" | "title";
type FilterOption = "all" | "active" | "complete";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "due_date", label: "Due date" },
  { value: "title", label: "Title" },
];

const FILTER_TABS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "complete", label: "Done" },
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

  const handleCreate = async (input: { title: string; description?: string; due_date?: string; percent_complete?: number | null; visibility?: "public" | "private" }) => {
    await taskService.createTask(userId, input);
    invalidateTasks();
    toast({ title: "Task created" });
  };

  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === "active" ? "complete" : "active";
    try {
      await taskService.updateTask(userId, task.id, { status: newStatus }, task);
    } catch (e) {
      toast({
        title: newStatus === "complete" ? "Couldn't complete the task" : "Couldn't reopen the task",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      invalidateTasks();
    }
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
  const tabCount = (v: FilterOption) =>
    v === "all" ? counts.all : v === "active" ? counts.active : counts.complete;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <PageHeader
        title="My Tasks"
        subtitle={total > 0 ? `${counts.active} active · ${counts.complete} complete` : "Track and complete your work"}
        actions={
          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2">
            <Plus className="h-3.5 w-3.5" /> New task
          </Button>
        }
      />

      <div className={cn("flex flex-col", selectedTask ? "hidden md:flex md:w-1/2 xl:w-3/5" : "w-full", "transition-all")}>
        {/* Toolbar: stat band + filters */}
        <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
          {/* The one bold element — a crimson edge-rail stat band. */}
          <section className="edge-rail flex items-center gap-6">
            <div>
              <p className="stat-numeral text-2xl leading-none text-foreground">{counts.all}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="stat-numeral text-2xl leading-none text-foreground">{counts.active}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Active</p>
            </div>
            <div>
              <p className="stat-numeral text-2xl leading-none text-[hsl(var(--status-done))]">{counts.complete}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Complete</p>
            </div>
          </section>

          {/* Filter tabs + search + sort */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="tablist"
              aria-label="Filter tasks by status"
              className="inline-flex items-center gap-0.5 rounded-md bg-muted/50 p-0.5"
            >
              {FILTER_TABS.map((tab) => {
                const active = filter === tab.value;
                return (
                  <button
                    key={tab.value}
                    role="tab"
                    aria-selected={active}
                    type="button"
                    onClick={() => setFilter(tab.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-medium",
                      "transition-colors duration-fast ease-standard outline-none",
                      "focus-visible:ring-2 focus-visible:ring-ring/35",
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                    <span className="tabular-nums text-muted-foreground">{tabCount(tab.value)}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56 sm:flex-none">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tasks…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                  aria-label="Search tasks"
                />
              </div>
              <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                <SelectTrigger className="h-8 w-[120px] text-xs" aria-label="Sort tasks">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {loading ? (
            <TaskListSkeleton />
          ) : filteredAndSorted.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-6 w-6" />}
              title={search ? "No matching tasks" : filter !== "all" ? `No ${filter} tasks` : "No tasks yet"}
              description={
                search
                  ? "Try a different search term."
                  : filter !== "all"
                    ? "Switch filters or create a new task."
                    : "Create your first task to get started."
              }
              action={
                !search && filter === "all" ? (
                  <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
                    <Plus className="h-3.5 w-3.5" /> Create task
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-2">
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
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</>
                    ) : (
                      `Load more (${remaining} remaining)`
                    )}
                  </Button>
                </div>
              )}
            </div>
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
