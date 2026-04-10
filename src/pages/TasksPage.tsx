import { useState, useEffect, useMemo } from "react";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@/types/tasks";
import * as taskService from "@/services/taskService";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { TaskListItem } from "@/components/tasks/TaskListItem";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";

type SortOption = "newest" | "oldest" | "due_date" | "title";
type FilterOption = "all" | "active" | "complete";

const TasksPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const userId = user?.id ?? profile?.user_id ?? "";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [filter, setFilter] = useState<FilterOption>("all");

  const loadTasks = async () => {
    try {
      const data = await taskService.fetchTasks();
      setTasks(data);
    } catch (err: any) {
      toast({ title: "Error loading tasks", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleCreate = async (input: { title: string; description?: string; due_date?: string; percent_complete?: number | null }) => {
    await taskService.createTask(userId, input);
    await loadTasks();
    toast({ title: "Task created" });
  };

  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === "active" ? "complete" : "active";
    await taskService.updateTask(userId, task.id, { status: newStatus }, task);
    await loadTasks();
  };

  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId) ?? null, [tasks, selectedTaskId]);

  const filteredAndSorted = useMemo(() => {
    let result = [...tasks];

    // Filter
    if (filter === "active") result = result.filter((t) => t.status === "active");
    if (filter === "complete") result = result.filter((t) => t.status === "complete");

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (sort) {
      case "newest":
        result.sort((a, b) => b.created_at.localeCompare(a.created_at));
        break;
      case "oldest":
        result.sort((a, b) => a.created_at.localeCompare(b.created_at));
        break;
      case "due_date":
        result.sort((a, b) => {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date.localeCompare(b.due_date);
        });
        break;
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return result;
  }, [tasks, filter, search, sort]);

  const counts = useMemo(() => ({
    all: tasks.length,
    active: tasks.filter((t) => t.status === "active").length,
    complete: tasks.filter((t) => t.status === "complete").length,
  }), [tasks]);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left: Task list */}
      <div className={`flex flex-col ${selectedTask ? "w-1/2 xl:w-3/5" : "w-full"} transition-all`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">My Tasks</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {counts.active} active · {counts.complete} complete
              </p>
            </div>
            <Button onClick={() => setShowCreate(true)} className="gap-2" size="sm">
              <Plus className="h-3.5 w-3.5" /> New Task
            </Button>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterOption)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SlidersHorizontal className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({counts.all})</SelectItem>
                <SelectItem value="active">Active ({counts.active})</SelectItem>
                <SelectItem value="complete">Complete ({counts.complete})</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <p className="text-sm text-muted-foreground">
                {search ? "No tasks match your search." : filter !== "all" ? `No ${filter} tasks.` : "No tasks yet."}
              </p>
              {!search && filter === "all" && (
                <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => setShowCreate(true)}>
                  <Plus className="h-3 w-3" /> Create your first task
                </Button>
              )}
            </div>
          ) : (
            filteredAndSorted.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                selected={task.id === selectedTaskId}
                onSelect={() => setSelectedTaskId(task.id === selectedTaskId ? null : task.id)}
                onToggleComplete={() => handleToggleComplete(task)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: Detail panel */}
      {selectedTask && (
        <div className="w-1/2 xl:w-2/5">
          <TaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTaskId(null)}
            onTaskUpdated={loadTasks}
          />
        </div>
      )}

      {/* Create modal */}
      <CreateTaskModal
        open={showCreate}
        onOpenChange={setShowCreate}
        onSubmit={handleCreate}
      />
    </div>
  );
};

export default TasksPage;
