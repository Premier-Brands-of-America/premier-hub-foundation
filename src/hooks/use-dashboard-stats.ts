import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isPreviewEnvironment } from "@/lib/environment";

const IS_PREVIEW = isPreviewEnvironment();

export function useDashboardStats() {
  const { user, profile } = useAuth();
  const userId = user?.id ?? profile?.user_id;

  const activeTasks = useQuery({
    queryKey: ["dashboard", "activeTasks", userId],
    queryFn: async () => {
      if (IS_PREVIEW || !userId) return 0;
      const { count, error } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "active");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });

  const assignedProjects = useQuery({
    queryKey: ["dashboard", "assignedProjects", userId],
    queryFn: async () => {
      if (IS_PREVIEW || !userId) return 0;
      const { data, error } = await supabase
        .from("project_stakeholders")
        .select("project_id")
        .eq("user_id", userId);
      if (error) throw error;
      if (!data || data.length === 0) return 0;
      const projectIds = data.map((s) => s.project_id);
      const { count, error: pErr } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .in("id", projectIds)
        .eq("status", "active");
      if (pErr) throw pErr;
      return count ?? 0;
    },
    enabled: !!userId,
  });

  const ownedProjects = useQuery({
    queryKey: ["dashboard", "ownedProjects", userId],
    queryFn: async () => {
      if (IS_PREVIEW || !userId) return 0;
      const { count, error } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId)
        .eq("status", "active");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });

  const overdueItems = useQuery({
    queryKey: ["dashboard", "overdueItems", userId],
    queryFn: async () => {
      if (IS_PREVIEW || !userId) return 0;
      const today = new Date().toISOString().split("T")[0];

      const { count: overdueTasks, error: tErr } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "active")
        .lt("due_date", today);
      if (tErr) throw tErr;

      // Overdue owned projects
      const { count: overdueOwned, error: pErr } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId)
        .eq("status", "active")
        .lt("desired_due_date", today);
      if (pErr) throw pErr;

      return (overdueTasks ?? 0) + (overdueOwned ?? 0);
    },
    enabled: !!userId,
  });

  const recentActivity = useQuery({
    queryKey: ["dashboard", "recentActivity", userId],
    queryFn: async () => {
      if (IS_PREVIEW || !userId) return 0;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { count: taskAct, error: tErr } = await supabase
        .from("task_activity")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", sevenDaysAgo);
      if (tErr) throw tErr;

      const { count: projAct, error: pErr } = await supabase
        .from("project_activity")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", sevenDaysAgo);
      if (pErr) throw pErr;

      return (taskAct ?? 0) + (projAct ?? 0);
    },
    enabled: !!userId,
  });

  const isLoading =
    activeTasks.isLoading ||
    assignedProjects.isLoading ||
    ownedProjects.isLoading ||
    overdueItems.isLoading ||
    recentActivity.isLoading;

  return {
    activeTasks: activeTasks.data ?? 0,
    assignedProjects: assignedProjects.data ?? 0,
    ownedProjects: ownedProjects.data ?? 0,
    overdueItems: overdueItems.data ?? 0,
    recentActivity: recentActivity.data ?? 0,
    isLoading,
  };
}
