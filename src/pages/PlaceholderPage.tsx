import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";

const pageNames: Record<string, string> = {
  "/tasks": "My Tasks",
  "/assigned-projects": "My Assigned Projects",
  "/owned-projects": "Projects I Own",
  "/public-projects": "All Public Projects",
  "/completed-projects": "Completed Projects",
  "/ai-assistant": "AI Assistant",
  "/admin": "Admin Tools",
};

const PlaceholderPage = () => {
  const location = useLocation();
  const title = pageNames[location.pathname] || "Page";

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <Construction className="h-12 w-12 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          This section is under development and will be available in a future phase.
        </p>
      </div>
    </div>
  );
};

export default PlaceholderPage;
