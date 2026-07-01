import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { fetchProject } from "@/services/projectService";
import { ProjectDetailPanel } from "@/components/projects/ProjectDetailPanel";
import { RestrictedContentPanel } from "@/components/admin-access/RestrictedContentPanel";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Deep-link view for a single project (`/projects/:id`). Renders the detail panel
 * when visible; when RLS forbids it, an admin sees the break-glass panel and
 * everyone else is bounced to /403. Also the target of the owner notification.
 */
export default function ProjectDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.is_admin ?? false;

  const { data: project, isLoading, refetch } = useQuery({
    queryKey: ["project-detail-route", id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (project) {
    return (
      <div className="mx-auto h-[calc(100vh-4rem)] w-full max-w-3xl">
        <ProjectDetailPanel
          project={project}
          onClose={() => navigate("/owned-projects")}
          onProjectUpdated={() => refetch()}
        />
      </div>
    );
  }

  if (isAdmin && id) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-8">
        <RestrictedContentPanel targetType="project" targetId={id} onGranted={() => refetch()} />
      </div>
    );
  }

  return <Navigate to="/403" replace />;
}
