import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import * as taskService from "@/services/taskService";
import * as projectService from "@/services/projectService";
import type { Task } from "@/types/tasks";
import type { ProjectWithMeta } from "@/types/projects";

// ─── Task Queries ───
export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: () => taskService.fetchTasks(),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const userId = user?.id ?? profile?.user_id ?? "";

  return useMutation({
    mutationFn: (input: { title: string; description?: string; due_date?: string; percent_complete?: number | null }) =>
      taskService.createTask(userId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const userId = user?.id ?? profile?.user_id ?? "";

  return useMutation({
    mutationFn: ({ task, updates }: { task: Task; updates: Partial<Pick<Task, "title" | "description" | "status" | "due_date" | "percent_complete">> }) =>
      taskService.updateTask(userId, task.id, updates, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

// ─── Project Queries ───
export function useProjects() {
  return useQuery<ProjectWithMeta[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const data = await projectService.fetchProjects();
      const projectIds = data.map(p => p.id);
      const stakeholderMap = await projectService.fetchStakeholdersForProjects(projectIds);
      return data.map(p => ({
        ...p,
        stakeholders: p.stakeholders || stakeholderMap[p.id] || [],
      }));
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const userId = user?.id ?? profile?.user_id ?? "";

  return useMutation({
    mutationFn: (input: { title: string; description?: string; visibility?: "public" | "private"; desired_due_date?: string }) =>
      projectService.createProject(userId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useInvalidateProjects() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["projects"] });
}

export function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["tasks"] });
}
