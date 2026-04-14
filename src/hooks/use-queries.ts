import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import * as taskService from "@/services/taskService";
import * as projectService from "@/services/projectService";
import type { Task } from "@/types/tasks";
import type { ProjectWithMeta } from "@/types/projects";

// ─── Task Queries ───

export function useTasks() {
  return useInfiniteQuery({
    queryKey: ["tasks"],
    queryFn: ({ pageParam = 0 }) => taskService.fetchTasks(pageParam),
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.page + 1;
      return nextPage * lastPage.pageSize < lastPage.total ? nextPage : undefined;
    },
    initialPageParam: 0,
  });
}

/** Flat helper: returns all loaded tasks and total count */
export function useTasksFlat() {
  const query = useTasks();
  const tasks: Task[] = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  return { ...query, tasks, total };
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
  return useInfiniteQuery({
    queryKey: ["projects"],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await projectService.fetchProjects(pageParam);
      const projectIds = result.items.map(p => p.id);
      const stakeholderMap = await projectService.fetchStakeholdersForProjects(projectIds);
      return {
        ...result,
        items: result.items.map(p => ({
          ...p,
          stakeholders: p.stakeholders || stakeholderMap[p.id] || [],
        })),
      };
    },
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.page + 1;
      return nextPage * lastPage.pageSize < lastPage.total ? nextPage : undefined;
    },
    initialPageParam: 0,
  });
}

/** Flat helper: returns all loaded projects and total count */
export function useProjectsFlat() {
  const query = useProjects();
  const projects: ProjectWithMeta[] = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  return { ...query, projects, total };
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
