import { Plus, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { DashboardView } from "@/components/dashboard/DashboardView";

const Dashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here's what's happening across your projects and tasks.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="gap-2" onClick={() => navigate("/tasks")}>
          <Plus className="h-3.5 w-3.5" />
          New Task
        </Button>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate("/owned-projects")}>
          <Plus className="h-3.5 w-3.5" />
          New Project
        </Button>
        <Button size="sm" variant="ghost-soft" className="gap-2" onClick={() => navigate("/ai-assistant")}>
          <Bot className="h-3.5 w-3.5" />
          AI Assistant
        </Button>
      </div>

      {/* Editable, persisted card grid (saved-view widgets) */}
      <DashboardView />
    </div>
  );
};

export default Dashboard;
