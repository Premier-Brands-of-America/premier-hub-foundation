import { useState, useEffect, useMemo } from "react";
import { Plus, Search, SlidersHorizontal, ClipboardList } from "lucide-react";
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

  useEffect(() => { loadTasks(); }, []);

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

  // On mobile, close detail when selecting a new item by scrolling
  const handleSelect = (id: string) => {
    setSelectedTaskId(id === selectedTaskId ? null : id);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left: Task list */}
      <div className={`flex flex-col ${selectedTask ? "hidden md:flex md:w-1/2 xl:w-3/5" : "w-full"} transition-all`}>
        <div className="px-4 sm:px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">My Tasks</h1>
              <p className="text-xs text-muted-foreground">
                {counts.active} active · {counts.complete} complete
              </p>
            </div>
            <Button onClick={() => setShowCreate(true)} className="gap-2" size="sm">
              <Plus className="h-3.5 w-3.5" /> New Task
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterOption)}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SlidersHorizontal className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({counts.all})</SelectItem>
                <SelectItem value="active">Active ({counts.active})</SelectItem>
                <SelectItem value="complete">Done ({counts.complete})</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
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

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <ClipboardList className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                {search ? "No matching tasks" : filter !== "all" ? `No ${filter} tasks` : "No tasks yet"}
              </p>
              <p className="text-xs text-muted-foreground mb-3 max-w-[240px]">
                {search
                  ? "Try a different search term."
                  : "Create your first task to get started."}
              </p>
              {!search && filter === "all" && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
                  <Plus className="h-3 w-3" /> Create Task
                </Button>
              )}
            </div>
          ) : (
            filteredAndSorted.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                selected={task.id === selectedTaskId}
                onSelect={() => handleSelect(task.id)}
                onToggleComplete={() => handleToggleComplete(task)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: Detail panel */}
      {selectedTask && (
        <div className="w-full md:w-1/2 xl:w-2/5 border-l border-border">
          <TaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTaskId(null)}
            onTaskUpdated={loadTasks}
          />
        </div>
      )}

      <CreateTaskModal open={showCreate} onOpenChange={setShowCreate} onSubmit={handleCreate} />
    </div>
  );
};

export default TasksPage;
