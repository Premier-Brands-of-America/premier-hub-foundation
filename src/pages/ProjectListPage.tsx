import { useState, useEffect, useMemo } from "react";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { ProjectWithMeta } from "@/types/projects";
import * as projectService from "@/services/projectService";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { ProjectListItem } from "@/components/projects/ProjectListItem";
import { ProjectDetailPanel } from "@/components/projects/ProjectDetailPanel";

type SortOption = "newest" | "oldest" | "due_date" | "title";

export type ProjectViewMode = "assigned" | "owned" | "public" | "completed";

interface ProjectListPageProps {
  mode: ProjectViewMode;
}

const viewConfig: Record<ProjectViewMode, { title: string; description: string }> = {
  assigned: { title: "My Assigned Projects", description: "Projects you are a stakeholder on (excluding ones you own)" },
  owned: { title: "Projects I Own", description: "Projects where you are the owner" },
  public: { title: "All Public Projects", description: "All publicly visible projects" },
  completed: { title: "Completed Projects", description: "All completed projects you can view" },
};

const ProjectListPage = ({ mode }: ProjectListPageProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const userId = user?.id ?? profile?.user_id ?? "";

  const [allProjects, setAllProjects] = useState<ProjectWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  const loadProjects = async () => {
    try {
      const data = await projectService.fetchProjects();
      // Enrich with stakeholders for filtering
      const enriched = await Promise.all(
        data.map(async (p) => {
          if (!p.stakeholders) {
            const stakeholders = await projectService.fetchProjectStakeholders(p.id);
            return { ...p, stakeholders };
          }
          return p;
        })
      );
      setAllProjects(enriched);
    } catch (err: any) {
      toast({ title: "Error loading projects", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProjects(); }, []);

  const handleCreate = async (input: { title: string; description?: string; visibility?: "public" | "private"; desired_due_date?: string }) => {
    await projectService.createProject(userId, input);
    await loadProjects();
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

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Sort
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

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className={`flex flex-col ${selectedProject ? "w-1/2 xl:w-3/5" : "w-full"} transition-all`}>
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">{config.title}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
            </div>
            <Button onClick={() => setShowCreate(true)} className="gap-2" size="sm">
              <Plus className="h-3.5 w-3.5" /> New Project
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : viewProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <p className="text-sm text-muted-foreground">
                {search ? "No projects match your search." : "No projects in this view yet."}
              </p>
              {!search && (mode === "owned" || mode === "assigned") && (
                <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => setShowCreate(true)}>
                  <Plus className="h-3 w-3" /> Create a project
                </Button>
              )}
            </div>
          ) : (
            viewProjects.map((project) => (
              <ProjectListItem
                key={project.id}
                project={project}
                selected={project.id === selectedProjectId}
                onSelect={() => setSelectedProjectId(project.id === selectedProjectId ? null : project.id)}
                currentUserId={userId}
              />
            ))
          )}
        </div>
      </div>

      {selectedProject && (
        <div className="w-1/2 xl:w-2/5">
          <ProjectDetailPanel
            project={selectedProject}
            onClose={() => setSelectedProjectId(null)}
            onProjectUpdated={loadProjects}
          />
        </div>
      )}

      <CreateProjectModal open={showCreate} onOpenChange={setShowCreate} onSubmit={handleCreate} />
    </div>
  );
};

export default ProjectListPage;
