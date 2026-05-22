import {
  CheckSquare,
  FolderKanban,
  Crown,
  AlertTriangle,
  Plus,
  Bot,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { DashboardWidget } from "@/components/DashboardWidget";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { useRole } from "@/hooks/useRole";
import { FeatureGate } from "@/components/FeatureGate";
import { DashboardWidget as DW } from "@/components/DashboardWidget";
import { FilePlus, Inbox, ListChecks, BarChart3 as BarChart3Icon } from "lucide-react";

const Dashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const stats = useDashboardStats();
  const role = useRole();

  if (stats.isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="space-y-1.5 modern:space-y-2">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight modern:text-3xl modern:tracking-[-0.02em]">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground modern:text-base">
          Here's what's happening across your projects and tasks.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 modern:gap-2.5">
        <Button size="sm" className="gap-2" onClick={() => navigate("/tasks")}>
          <Plus className="h-3.5 w-3.5 modern:h-4 modern:w-4" />
          New Task
        </Button>
        <Button size="sm" variant="outline" className="gap-2 modern:hidden" onClick={() => navigate("/owned-projects")}>
          <Plus className="h-3.5 w-3.5" />
          New Project
        </Button>
        <Button size="sm" variant="tinted" className="gap-2 hidden modern:inline-flex" onClick={() => navigate("/owned-projects")}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
        <Button size="sm" variant="outline" className="gap-2 modern:hidden" onClick={() => navigate("/ai-assistant")}>
          <Bot className="h-3.5 w-3.5" />
          AI Assistant
        </Button>
        <Button size="sm" variant="ghost-soft" className="gap-2 hidden modern:inline-flex" onClick={() => navigate("/ai-assistant")}>
          <Bot className="h-4 w-4" />
          AI Assistant
        </Button>
      </div>

      {/* Widget Grid — bento in modern */}
      <div className="grid gap-4 modern:gap-5 sm:grid-cols-2 lg:grid-cols-6 auto-rows-[minmax(140px,auto)]">
        <div className="lg:col-span-2">
        <DashboardWidget title="My Active Tasks" icon={CheckSquare} accentColor="info">
          {stats.activeTasks > 0 ? (
            <StatDisplay count={stats.activeTasks} label="active task" action={() => navigate("/tasks")} actionLabel="View Tasks" />
          ) : (
            <EmptyHint message="No active tasks yet" hint="Create tasks to track your personal work items." action={() => navigate("/tasks")} actionLabel="Go to Tasks" />
          )}
        </DashboardWidget>
        </div>

        <div className="lg:col-span-2">
        <DashboardWidget title="Assigned Projects" icon={FolderKanban} accentColor="accent">
          {stats.assignedProjects > 0 ? (
            <StatDisplay count={stats.assignedProjects} label="assigned project" action={() => navigate("/assigned-projects")} actionLabel="View Projects" />
          ) : (
            <EmptyHint message="No assigned projects" hint="Projects where you're a stakeholder will appear here." action={() => navigate("/assigned-projects")} actionLabel="View Projects" />
          )}
        </DashboardWidget>
        </div>

        <div className="lg:col-span-2">
        <DashboardWidget title="Projects I Own" icon={Crown} accentColor="warning">
          {stats.ownedProjects > 0 ? (
            <StatDisplay count={stats.ownedProjects} label="owned project" action={() => navigate("/owned-projects")} actionLabel="View Projects" />
          ) : (
            <EmptyHint message="No owned projects" hint="Projects you create or manage will appear here." action={() => navigate("/owned-projects")} actionLabel="View Projects" />
          )}
        </DashboardWidget>
        </div>

        <div className="lg:col-span-2 lg:row-span-2">
        <DashboardWidget title="Overdue Items" icon={AlertTriangle} accentColor="danger">
          <div className="flex items-center gap-3">
            <p className="text-foreground font-semibold text-2xl">{stats.overdueItems}</p>
            <p className="text-xs text-muted-foreground">
              {stats.overdueItems === 0
                ? "No overdue tasks or projects. 🎉"
                : `overdue item${stats.overdueItems !== 1 ? "s" : ""} need${stats.overdueItems === 1 ? "s" : ""} attention`}
            </p>
          </div>
        </DashboardWidget>
        </div>

        <div className="lg:col-span-4 lg:row-span-2">
        <DashboardWidget title="Recent Activity" icon={ClipboardList}>
          {stats.recentActivity > 0 ? (
            <StatDisplay count={stats.recentActivity} label="update" suffix="in the last 7 days" />
          ) : (
            <EmptyHint message="No recent activity" hint="Updates and changes to your projects will show here." />
          )}
        </DashboardWidget>
        </div>
      </div>

      {/* Role-aware Art Request Portal sections */}
      <FeatureGate feature="art_request_portal">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Art Request Portal</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {role === "admin" && (
              <>
                <DW title="Open Requests" icon={Inbox}>
                  <p className="text-xs text-muted-foreground">KPI placeholder.</p>
                </DW>
                <DW title="Overdue" icon={BarChart3Icon} accentColor="accent">
                  <p className="text-xs text-muted-foreground">KPI placeholder.</p>
                </DW>
                <DW title="Awaiting Approval" icon={ListChecks}>
                  <p className="text-xs text-muted-foreground">KPI placeholder.</p>
                </DW>
              </>
            )}
            {role === "designer" && (
              <DW title="My Assignments" icon={Inbox}>
                <p className="text-xs text-muted-foreground">Assignments will appear here.</p>
              </DW>
            )}
            {role === "requester" && (
              <>
                <DW title="My Submitted Requests" icon={ListChecks}>
                  <p className="text-xs text-muted-foreground">Your requests will appear here.</p>
                </DW>
                <div className="flex items-center">
                  <Button size="lg" className="gap-2" onClick={() => navigate("/requests/new")}>
                    <FilePlus className="h-4 w-4" />
                    Submit New Request
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </FeatureGate>
    </div>
  );
};

function StatDisplay({
  count,
  label,
  suffix,
  action,
  actionLabel,
}: {
  count: number;
  label: string;
  suffix?: string;
  action?: () => void;
  actionLabel?: string;
}) {
  const plural = count !== 1 ? "s" : "";
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <p className="text-foreground font-semibold text-2xl">{count}</p>
        <p className="text-xs text-muted-foreground">
          {label}{plural}{suffix ? ` ${suffix}` : ""}
        </p>
      </div>
      {action && actionLabel && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={action}
        >
          {actionLabel}
          <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function EmptyHint({
  message,
  hint,
  action,
  actionLabel,
}: {
  message: string;
  hint: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-foreground">{message}</p>
      <p className="text-xs">{hint}</p>
      {action && actionLabel && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={action}
        >
          {actionLabel}
          <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export default Dashboard;
