import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, CalendarRange, LayoutGrid, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeInvalidation } from "@/hooks/use-realtime";
import * as taskService from "@/services/taskService";
import { cn } from "@/lib/utils";
import {
  KpiStrip,
  SectionHeader,
  WorkItemRow,
  type Kpi,
} from "@/components/pressroom";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { DayRail } from "@/components/dashboard/DayRail";
import { useMyDay, type DayItem } from "@/components/dashboard/useMyDay";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";

/** Greeting that tracks the local time of day. */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = user?.id ?? profile?.user_id ?? "";
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  // Home reads the same task cache as /tasks, so realtime task changes and the
  // completable checkboxes below stay in lockstep with the list page.
  useRealtimeInvalidation("tasks", ["tasks"]);

  const day = useMyDay();
  const [showCustomize, setShowCustomize] = useState(false);

  const eyebrow = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Toggle a task complete — the exact pattern TasksPage uses (same service,
  // same optimistic-free invalidation), so the two screens never disagree.
  const toggleTask = async (item: DayItem) => {
    if (!item.task) return;
    const task = item.task;
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
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-day"] });
    }
  };

  const kpis: Kpi[] = [
    {
      value: day.counts.overdue,
      label: "overdue",
      token: day.counts.overdue ? "--status-danger" : undefined,
      onClick: () => navigate("/tasks"),
    },
    {
      value: day.counts.dueToday,
      label: "due today",
      token: day.counts.dueToday ? "--status-warning" : undefined,
      onClick: () => navigate("/tasks"),
    },
    {
      value: day.counts.teamQueue,
      label: "in team queue",
      onClick: () => navigate("/queue"),
    },
  ];

  if (day.isLoading) return <DashboardSkeleton />;

  const overdueItems = day.attention.filter(
    (i) => i.dueDate != null && !i.idle,
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20.5rem]">
      {/* ── main column ── */}
      <main className="flex min-w-0 flex-col gap-4">
        {/* (1) greeting + inline KPI strip */}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-1 pb-2">
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] tabular-nums text-muted-foreground">
              {eyebrow}
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              {greeting()}, {firstName}
            </h1>
          </div>
          <KpiStrip items={kpis} className="pb-1" />
        </div>

        {/* (2) needs your attention */}
        {day.attention.length > 0 && (
          <section className="overflow-hidden rounded-lg border border-border bg-card" aria-label="Needs your attention">
            <div className="border-b border-border px-3 py-2.5">
              <SectionHeader
                icon={AlertTriangle}
                label="Needs your attention"
                count={day.attention.length}
                tone="--status-danger"
                action={{ label: "Team queue", to: "/queue" }}
              />
            </div>
            <div className="divide-y divide-border">
              {day.attention.map((item) => (
                <WorkItemRow
                  key={item.key}
                  to={item.to}
                  title={item.title}
                  state={item.state}
                  context={item.context}
                  dueDate={item.dueDate}
                  assignee={item.assignee}
                  code={item.code}
                  className="rounded-none border-transparent px-3"
                  actions={
                    <span
                      className="rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:border-border hover:bg-accent"
                      aria-hidden
                    >
                      Open
                    </span>
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* (3) today */}
        <section className="overflow-hidden rounded-lg border border-border bg-card" aria-label="Today">
          <div className="border-b border-border px-3 py-2.5">
            <SectionHeader
              icon={Clock}
              label="Today"
              count={day.today.length}
              action={{ label: "My Work", to: "/tasks" }}
            />
          </div>
          {day.today.length === 0 ? (
            <EmptyLine
              text="Nothing due today — you're clear."
              action="Plan ahead"
              onAction={() => navigate("/tasks")}
            />
          ) : (
            <div className="divide-y divide-border">
              {day.today.map((item) =>
                item.kind === "task" && item.task ? (
                  <WorkItemRow
                    key={item.key}
                    title={item.title}
                    state={item.state}
                    dueDate={item.dueDate}
                    done={item.task.status === "complete"}
                    onClick={() => navigate("/tasks")}
                    className="rounded-none border-transparent px-3"
                    leading={
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTask(item);
                        }}
                        aria-label={item.task.status === "complete" ? "Reopen task" : "Mark complete"}
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          item.task.status === "complete"
                            ? "border-[hsl(var(--status-done))] bg-[hsl(var(--status-done))] text-background"
                            : "border-muted-foreground/50 hover:border-foreground",
                        )}
                      >
                        {item.task.status === "complete" && (
                          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    }
                  />
                ) : (
                  <WorkItemRow
                    key={item.key}
                    to={item.to}
                    title={item.title}
                    state={item.state}
                    context={item.context}
                    dueDate={item.dueDate}
                    assignee={item.assignee}
                    code={item.code}
                    className="rounded-none border-transparent px-3"
                  />
                ),
              )}
            </div>
          )}
        </section>

        {/* team queue · this week */}
        {day.teamWeek.length > 0 && (
          <section className="overflow-hidden rounded-lg border border-border bg-card" aria-label="Team queue this week">
            <div className="border-b border-border px-3 py-2.5">
              <SectionHeader
                icon={CalendarRange}
                label="Team queue · this week"
                count={day.teamWeek.length}
                action={{ label: `All ${day.counts.teamQueue} in Art Requests`, to: "/queue" }}
              />
            </div>
            <div className="divide-y divide-border">
              {day.teamWeek.map((item) => (
                <WorkItemRow
                  key={item.key}
                  to={item.to}
                  title={item.title}
                  state={item.state}
                  context={item.context}
                  dueDate={item.dueDate}
                  assignee={item.assignee}
                  code={item.code}
                  className="rounded-none border-transparent px-3"
                />
              ))}
            </div>
          </section>
        )}

        {/* quiet, secondary access to the editable card grid */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowCustomize((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={showCustomize}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            {showCustomize ? "Hide custom cards" : "Customize dashboard"}
          </button>
          {showCustomize && (
            <div className="mt-3">
              <DashboardView />
            </div>
          )}
        </div>
      </main>

      {/* ── day rail (stacks below main on mobile) ── */}
      <DayRail dueItems={day.dueItems} overdue={overdueItems} />
    </div>
  );
};

/** One-line empty state: message + a single quiet action. */
function EmptyLine({ text, action, onAction }: { text: string; action: string; onAction: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4" role="status">
      <Check className="h-4 w-4 text-muted-foreground" aria-hidden />
      <span className="text-sm text-muted-foreground">{text}</span>
      <button
        type="button"
        onClick={onAction}
        className="ml-auto text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {action} →
      </button>
    </div>
  );
}

export default Dashboard;
