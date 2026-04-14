import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/tasks": "My Tasks",
  "/assigned-projects": "My Assigned Projects",
  "/owned-projects": "Projects I Own",
  "/public-projects": "All Public Projects",
  "/completed-projects": "Completed Projects",
  "/ai-assistant": "AI Assistant",
  "/admin": "Admin Settings",
  "/diagnostics": "Diagnostics",
};

export function RouteAnnouncer() {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const name = pageNames[location.pathname] || "Page";
    setAnnouncement(`Navigated to ${name}`);
  }, [location.pathname]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  );
}
