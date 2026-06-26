/**
 * Human-readable labels for top-level routes. Single source of truth for
 * the breadcrumb trail and the shell header's fallback page title.
 */
export const routeLabels: Record<string, string> = {
  "/": "Dashboard",
  "/tasks": "My Tasks",
  "/pages": "Pages",
  "/timeline": "Timeline",
  "/assigned-projects": "Assigned Projects",
  "/owned-projects": "Projects I Own",
  "/public-projects": "Public Projects",
  "/completed-projects": "Completed Projects",
  "/ai-assistant": "AI Assistant",
  "/graph": "Graph",
  "/admin": "Settings",
  "/admin/settings": "Settings",
  "/diagnostics": "Diagnostics",
  "/requests": "My Requests",
  "/requests/new": "Submit Request",
  "/queue": "Queue",
  "/workload": "Department Workload",
  "/reports": "Reports",
  "/audit": "Audit Log",
  "/profile": "Profile",
};

/** Title-cases a path segment as a last-resort fallback (e.g. "art-x" → "Art X"). */
function humanize(segment: string): string {
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Best-effort page title for a pathname, for the shell header fallback. */
export function titleForPath(pathname: string): string {
  if (routeLabels[pathname]) return routeLabels[pathname];
  const last = pathname.split("/").filter(Boolean).pop();
  return last ? humanize(last) : "Dashboard";
}
