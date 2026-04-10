import {
  CheckSquare,
  FolderKanban,
  Crown,
  Bell,
  AlertTriangle,
  Zap,
  Plus,
  Bot,
} from "lucide-react";
import { DashboardWidget } from "@/components/DashboardWidget";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Welcome back, {firstName}</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening across your projects and tasks.</p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="gap-2">
          <Plus className="h-3.5 w-3.5" />
          Create Task
        </Button>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="h-3.5 w-3.5" />
          Create Project
        </Button>
        <Button size="sm" variant="outline" className="gap-2">
          <Bot className="h-3.5 w-3.5" />
          Open AI Assistant
        </Button>
      </div>

      {/* Widget Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardWidget title="My Active Tasks" icon={CheckSquare}>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <span className="text-foreground">No active tasks</span>
            </div>
            <p className="text-xs">Tasks assigned to you will appear here.</p>
          </div>
        </DashboardWidget>

        <DashboardWidget title="My Assigned Active Projects" icon={FolderKanban}>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <span className="text-foreground">No assigned projects</span>
            </div>
            <p className="text-xs">Projects where you are a team member.</p>
          </div>
        </DashboardWidget>

        <DashboardWidget title="Projects I Own" icon={Crown} accentColor="warning">
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <span className="text-foreground">No owned projects</span>
            </div>
            <p className="text-xs">Projects you created or manage.</p>
          </div>
        </DashboardWidget>

        <DashboardWidget title="Recent Updates" icon={Bell}>
          <div className="space-y-2">
            <p className="text-xs">Activity relevant to you will show here.</p>
          </div>
        </DashboardWidget>

        <DashboardWidget title="Overdue Items" icon={AlertTriangle} accentColor="accent">
          <div className="space-y-2">
            <p className="text-foreground font-medium text-lg">0</p>
            <p className="text-xs">No overdue tasks or milestones. 🎉</p>
          </div>
        </DashboardWidget>

        <DashboardWidget title="Quick Actions" icon={Zap}>
          <div className="space-y-2">
            <button className="block w-full text-left py-1.5 text-foreground hover:text-accent transition-colors text-sm">
              → Create a new task
            </button>
            <button className="block w-full text-left py-1.5 text-foreground hover:text-accent transition-colors text-sm">
              → Start a new project
            </button>
            <button className="block w-full text-left py-1.5 text-foreground hover:text-accent transition-colors text-sm">
              → Ask the AI Assistant
            </button>
          </div>
        </DashboardWidget>
      </div>
    </div>
  );
};

export default Dashboard;
