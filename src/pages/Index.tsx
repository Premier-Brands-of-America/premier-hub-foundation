import { Plus, Bot, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { DashboardView } from "@/components/dashboard/DashboardView";

/** Greeting that tracks the local time of day. */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const Dashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Your command center"
        actions={
          <Button size="sm" className="gap-2" onClick={() => navigate("/tasks")}>
            <Plus className="h-3.5 w-3.5" />
            New task
          </Button>
        }
      />

      {/* Hero / overview band — the one bold thing on the screen (crimson edge-rail). */}
      <section className="edge-rail">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground tabular-nums">
          {today}
        </p>
        <h1 className="mt-1 text-3xl font-display font-semibold tracking-tight text-foreground">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Here's what's happening across your projects, tasks, and pages.
        </p>

        {/* Quick actions */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => navigate("/owned-projects")}
          >
            <FolderPlus className="h-3.5 w-3.5" />
            New project
          </Button>
          <Button
            size="sm"
            variant="ghost-soft"
            className="gap-2"
            onClick={() => navigate("/ai-assistant")}
          >
            <Bot className="h-3.5 w-3.5" />
            AI Assistant
          </Button>
        </div>
      </section>

      {/* Editable, persisted card grid (saved-view widgets) */}
      <DashboardView />
    </div>
  );
};

export default Dashboard;
