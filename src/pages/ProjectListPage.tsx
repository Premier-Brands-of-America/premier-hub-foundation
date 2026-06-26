import { useState, useMemo } from "react";
import { Plus, FolderOpen, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useProjectsFlat } from "@/hooks/use-queries";
import { useRealtimeInvalidation } from "@/hooks/use-realtime";
import { ProjectListSkeleton } from "@/components/projects/ProjectListSkeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/PageHeader";

import * as projectService from "@/services/projectService";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { ProjectListItem } from "@/components/projects/ProjectListItem";
import { ProjectDetailPanel } from "@/components/projects/ProjectDetailPanel";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

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

  // Stat band counts (across all loaded projects, before view/search filtering).
  const stats = useMemo(() => {
    const active = allProjects.filter((p) => p.status === "active").length;
    const complete = allProjects.filter((p) => p.status === "complete").length;
    return { total: allProjects.length, active, complete };
  }, [allProjects]);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <PageHeader
        title={config.title}
        subtitle={config.description}
        actions={
          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2">
            <Plus className="h-3.5 w-3.5" /> New project
          </Button>
        }
      />

      <div className={cn("flex flex-col", selectedProject ? "hidden md:flex md:w-1/2 xl:w-3/5" : "w-full", "transition-all")}>
        {/* Toolbar: crimson edge-rail stat band + search/sort */}
        <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
          {/* The one bold element — a crimson edge-rail stat band. */}
          <section className="edge-rail flex items-center gap-6">
            <div>
              <p className="stat-numeral text-2xl leading-none text-foreground">{stats.total}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Loaded</p>
            </div>
            <div>
              <p className="stat-numeral text-2xl leading-none text-foreground">{stats.active}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Active</p>
            </div>
            <div>
              <p className="stat-numeral text-2xl leading-none text-[hsl(var(--status-done))]">{stats.complete}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Complete</p>
            </div>
            <div className="ml-auto text-right">
              <p className="stat-numeral text-2xl leading-none text-[hsl(var(--entity-project))]">{viewProjects.length}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">In view</p>
            </div>
          </section>

          {/* Search + sort */}
          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-sm"
                aria-label="Search projects"
              />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="h-8 w-[120px] text-xs" aria-label="Sort projects">
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

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {loading ? (
            <ProjectListSkeleton />
          ) : viewProjects.length === 0 ? (
            <EmptyState
              icon={<FolderOpen className="h-6 w-6" />}
              title={search ? "No matching projects" : config.emptyMessage}
              description={search ? "Try a different search term." : config.emptyHint}
              action={
                !search && mode === "owned" ? (
                  <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
                    <Plus className="h-3.5 w-3.5" /> Create project
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-2">
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
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</>
                    ) : (
                      `Load more (${remaining} remaining)`
                    )}
                  </Button>
                </div>
              )}
            </div>
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
