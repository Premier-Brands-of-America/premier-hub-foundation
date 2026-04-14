import { useState, useMemo } from "react";
import { Plus, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useProjectsFlat } from "@/hooks/use-queries";
import { useRealtimeInvalidation } from "@/hooks/use-realtime";
import { ProjectListSkeleton } from "@/components/projects/ProjectListSkeleton";
import { SearchFilterBar } from "@/components/SearchFilterBar";

import * as projectService from "@/services/projectService";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { ProjectListItem } from "@/components/projects/ProjectListItem";
import { ProjectDetailPanel } from "@/components/projects/ProjectDetailPanel";
import { useQueryClient } from "@tanstack/react-query";

type SortOption = "newest" | "oldest" | "due_date" | "title";

export type ProjectViewMode = "assigned" | "owned" | "public" | "completed";

interface ProjectListPageProps {
  mode: ProjectViewMode;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "due_date", label: "Due Date" },
  { value: "title", label: "Title" },
];

const viewConfig: Record<ProjectViewMode, { title: string; description: string; emptyMessage: string; emptyHint: string }> = {
  assigned: {
    title: "My Assigned Projects",
    description: "Projects you are a stakeholder on",
    emptyMessage: "No assigned projects",
    emptyHint: "When you're added as a stakeholder on a project, it will appear here.",
  },
  owned: {
    title: "Projects I Own",
    description: "Projects where you are the owner",
    emptyMessage: "No owned projects",
    emptyHint: "Projects you create or take ownership of will appear here.",
  },
  public: {
    title: "All Public Projects",
    description: "All publicly visible projects",
    emptyMessage: "No public projects",
    emptyHint: "Public projects are visible to all authenticated users.",
  },
  completed: {
    title: "Completed Projects",
    description: "All completed projects you can view",
    emptyMessage: "No completed projects",
    emptyHint: "Projects marked as complete will appear here.",
  },
};

const ProjectListPage = ({ mode }: ProjectListPageProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const userId = user?.id ?? profile?.user_id ?? "";
  const queryClient = useQueryClient();

  const { projects: allProjects, total, isLoading: loading, hasNextPage, fetchNextPage, isFetchingNextPage } = useProjectsFlat();
  useRealtimeInvalidation("projects", ["projects"]);
  useRealtimeInvalidation("project_stakeholders", ["projects"]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  const invalidateProjects = () => queryClient.invalidateQueries({ queryKey: ["projects"] });

  const handleCreate = async (input: { title: string; description?: string; visibility?: "public" | "private"; desired_due_date?: string }) => {
    await projectService.createProject(userId, input);
    invalidateProjects();
    toast({ title: "Project created" });
  };

  const viewProjects = useMemo(() => {
    let result = [...allProjects];

    switch (mode) {
      case "assigned":
        result = result.filter(
          (p) => p.status === "active" && p.owner_id !== userId &&
            p.stakeholders?.some((s) => s.user_id === userId)
        );
        break;
      case "owned":
        result = result.filter((p) => p.status === "active" && p.owner_id === userId);
        break;
      case "public":
        result = result.filter((p) => p.status === "active" && p.visibility === "public");
        break;
      case "completed":
        result = result.filter((p) => p.status === "complete");
        break;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
      );
    }

    switch (sort) {
      case "newest": result.sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
      case "oldest": result.sort((a, b) => a.created_at.localeCompare(b.created_at)); break;
      case "due_date":
        result.sort((a, b) => {
          const da = a.updated_due_date || a.desired_due_date || "";
          const db = b.updated_due_date || b.desired_due_date || "";
          if (!da && !db) return 0;
          if (!da) return 1;
          if (!db) return -1;
          return da.localeCompare(db);
        });
        break;
      case "title": result.sort((a, b) => a.title.localeCompare(b.title)); break;
    }

    return result;
  }, [allProjects, mode, search, sort, userId]);

  const selectedProject = useMemo(() => allProjects.find((p) => p.id === selectedProjectId) ?? null, [allProjects, selectedProjectId]);
  const config = viewConfig[mode];
  const remaining = total - allProjects.length;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className={`flex flex-col ${selectedProject ? "hidden md:flex md:w-1/2 xl:w-3/5" : "w-full"} transition-all`}>
        <div className="px-4 sm:px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">
                {config.title} {viewProjects.length > 0 && <span className="text-muted-foreground font-normal">({viewProjects.length})</span>}
              </h1>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>
            <Button onClick={() => setShowCreate(true)} className="gap-2" size="sm">
              <Plus className="h-3.5 w-3.5" /> New Project
            </Button>
          </div>
          <SearchFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search projects..."
            sortValue={sort}
            onSortChange={(v) => setSort(v as SortOption)}
            sortOptions={SORT_OPTIONS}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5">
          {loading ? (
            <ProjectListSkeleton />
          ) : viewProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <FolderOpen className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">{config.emptyMessage}</p>
              <p className="text-xs text-muted-foreground mb-3 max-w-[280px]">
                {search ? "Try a different search term." : config.emptyHint}
              </p>
              {!search && (mode === "owned") && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
                  <Plus className="h-3 w-3" /> Create Project
                </Button>
              )}
            </div>
          ) : (
            <>
              {viewProjects.map((project) => (
                <ProjectListItem
                  key={project.id}
                  project={project}
                  selected={project.id === selectedProjectId}
                  onSelect={() => setSelectedProjectId(project.id === selectedProjectId ? null : project.id)}
                  currentUserId={userId}
                />
              ))}
              {hasNextPage && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="gap-2"
                  >
                    {isFetchingNextPage ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...</>
                    ) : (
                      `Load more (${remaining} remaining)`
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selectedProject && (
        <div className="w-full md:w-1/2 xl:w-2/5 border-l border-border">
          <ProjectDetailPanel
            project={selectedProject}
            onClose={() => setSelectedProjectId(null)}
            onProjectUpdated={invalidateProjects}
          />
        </div>
      )}

      <CreateProjectModal open={showCreate} onOpenChange={setShowCreate} onSubmit={handleCreate} />
    </div>
  );
};

export default ProjectListPage;
