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
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { WorkItemRow, KpiStrip, SectionHeader, taskProofState } from "@/components/pressroom";
import { daysUntil } from "@/lib/dueDate";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type SortOption = "smart" | "due_date" | "newest" | "title";
type FilterOption = "all" | "active" | "complete";

const SORT_OPTIONS = [
  { value: "smart", label: "Smart" },
  { value: "due_date", label: "Due date" },
  { value: "newest", label: "Recently created" },
  { value: "title", label: "Title" },
];

const FILTER_TABS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "complete", label: "Done" },
];

/** Bucket a task by due date for the grouped "smart" view. */
type Bucket = "overdue" | "today" | "week" | "later" | "nodate" | "done";
const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: "Overdue",
  today: "Today",
  week: "This week",
  later: "Later",
  nodate: "No due date",
  done: "Done",
};
const BUCKET_ORDER: Bucket[] = ["overdue", "today", "week", "later", "nodate", "done"];

function bucketOf(t: Task): Bucket {
  if (t.status === "complete") return "done";
  if (!t.due_date) return "nodate";
  const d = daysUntil(t.due_date);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= 7) return "week";
  return "later";
}

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
  const [sort, setSort] = useState<SortOption>("smart");
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

  const filtered = useMemo(() => {
    let result = [...tasks];
    if (filter === "active") result = result.filter((t) => t.status === "active");
    if (filter === "complete") result = result.filter((t) => t.status === "complete");
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [tasks, filter, search]);

  const flatSorted = useMemo(() => {
    const r = [...filtered];
    const byDue = (a: Task, b: Task) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    };
    switch (sort) {
      case "due_date": r.sort(byDue); break;
      case "newest": r.sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
      case "title": r.sort((a, b) => a.title.localeCompare(b.title)); break;
      default: break;
    }
    return r;
  }, [filtered, sort]);

  // Smart view groups by due bucket; other sorts render a flat list.
  const groups = useMemo(() => {
    if (sort !== "smart") return null;
    const m = new Map<Bucket, Task[]>();
    for (const t of filtered) {
      const b = bucketOf(t);
      (m.get(b) ?? m.set(b, []).get(b)!).push(t);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
    }
    return BUCKET_ORDER.filter((b) => (m.get(b)?.length ?? 0) > 0).map((b) => ({ bucket: b, items: m.get(b)! }));
  }, [filtered, sort]);

  const counts = useMemo(() => {
    const active = tasks.filter((t) => t.status === "active");
    return {
      all: tasks.length,
      active: active.length,
      complete: tasks.filter((t) => t.status === "complete").length,
      overdue: active.filter((t) => t.due_date && daysUntil(t.due_date) < 0).length,
      today: active.filter((t) => t.due_date && daysUntil(t.due_date) === 0).length,
    };
  }, [tasks]);

  const tabCount = (v: FilterOption) => (v === "all" ? counts.all : v === "active" ? counts.active : counts.complete);
  const remaining = total - tasks.length;

  const renderRow = (task: Task) => (
    <WorkItemRow
      key={task.id}
      title={task.title}
      state={taskProofState(task.status, task.percent_complete)}
      dueDate={task.due_date}
      done={task.status === "complete"}
      onClick={() => setSelectedTaskId(task.id === selectedTaskId ? null : task.id)}
      className={cn(task.id === selectedTaskId && "border-border bg-accent/50")}
      leading={
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }}
          aria-label={task.status === "complete" ? "Reopen task" : "Mark complete"}
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-full border transition-colors",
            task.status === "complete"
              ? "border-[hsl(var(--status-done))] bg-[hsl(var(--status-done))] text-white"
              : "border-muted-foreground/50 hover:border-foreground",
          )}
        >
          {task.status === "complete" && (
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      }
    />
  );

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <PageHeader
        title="My Tasks"
        subtitle={total > 0 ? `${counts.active} active · ${counts.complete} done` : "Track and complete your work"}
        actions={
          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2">
            <Plus className="h-3.5 w-3.5" /> New task
          </Button>
        }
      />

      <div className={cn("flex flex-col", selectedTask ? "hidden md:flex md:w-1/2 xl:w-3/5" : "w-full", "transition-all")}>
        {/* Toolbar: inline KPI strip + filters + search + sort */}
        <div className="border-b border-border px-4 py-3 sm:px-6">
          <KpiStrip
            className="mb-3"
            items={[
              { value: counts.active, label: "active", onClick: () => setFilter("active"), active: filter === "active" },
              { value: counts.overdue, label: "overdue", token: counts.overdue ? "--status-danger" : undefined },
              { value: counts.today, label: "due today", token: counts.today ? "--status-warning" : undefined },
              { value: counts.complete, label: "done", onClick: () => setFilter("complete"), active: filter === "complete" },
            ]}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div role="tablist" aria-label="Filter tasks by status" className="inline-flex items-center gap-0.5 rounded-md bg-muted/50 p-0.5">
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
                      "inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
                      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
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
                <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Sort tasks">
                  <span className="text-muted-foreground">Sort:&nbsp;</span>
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
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-6 w-6" />}
              title={search ? "No matching tasks" : filter !== "all" ? `No ${filter === "complete" ? "done" : filter} tasks` : "Inbox zero"}
              description={
                search ? "Try a different search term."
                  : filter !== "all" ? "Switch filters or create a new task."
                  : "Nothing on your plate. Create a task to get started."
              }
              action={
                !search && filter === "all" ? (
                  <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
                    <Plus className="h-3.5 w-3.5" /> Create task
                  </Button>
                ) : undefined
              }
            />
          ) : groups ? (
            <div className="space-y-5">
              {groups.map(({ bucket, items }) => (
                <section key={bucket} className="space-y-1">
                  <SectionHeader
                    label={BUCKET_LABEL[bucket]}
                    count={items.length}
                    tone={bucket === "overdue" ? "--status-danger" : bucket === "today" ? "--status-warning" : undefined}
                    className="mb-1"
                  />
                  <div className="space-y-0.5">{items.map(renderRow)}</div>
                </section>
              ))}
              {hasNextPage && (
                <div className="flex justify-center py-4">
                  <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="gap-2">
                    {isFetchingNextPage ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</> : `Load more (${remaining} remaining)`}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {flatSorted.map(renderRow)}
              {hasNextPage && (
                <div className="flex justify-center py-4">
                  <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="gap-2">
                    {isFetchingNextPage ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</> : `Load more (${remaining} remaining)`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedTask && (
        <div className="w-full border-l border-border md:w-1/2 xl:w-2/5">
          <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTaskId(null)} onTaskUpdated={invalidateTasks} />
        </div>
      )}

      <CreateTaskModal open={showCreate} onOpenChange={setShowCreate} onSubmit={handleCreate} />
    </div>
  );
};

export default TasksPage;
