import {
  Home,
  CheckSquare,
  FolderKanban,
  Bot,
  BarChart3,
  Settings,
  LogOut,
  ListChecks,
  ScrollText,
  FileType2,
  CalendarRange,
  Network,
  KanbanSquare,
  Wrench,
  Inbox,
  Activity,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { BrandLogo } from "@/components/BrandLogo";
import { brand } from "@/config/brand";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { NavItem, type NavItemConfig } from "@/components/NavItem";

// ── Consolidated IA (21 → ~8 role-aware): the sidebar names JOBS, not routes.
// Project sibling lists (/assigned-, /owned-, …) are tabs of Projects.
// Graph/Org/Memory are one "Explore" canvas (its in-view toggle switches lens).
// AI Assistant lives in the top bar; "New request" is a button on Art Requests.
// Department Workload is a tab inside Reports.

// WORKSPACE — the daily surfaces, task-first.
const workspaceNav = [
  { title: "Home", url: "/", icon: Home },
  { title: "My Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Planner", url: "/planner", icon: KanbanSquare },
  { title: "Calendar", url: "/timeline", icon: CalendarRange },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Pages", url: "/pages", icon: FileType2 },
];

// ART REQUESTS — the art-request portal (intake + triage). Named "Art Requests"
// (not just "Requests") so it never reads as generic — the portal is exclusively
// for the Art Department.
const requestsNav: NavItemConfig[] = [
  { label: "My Requests", to: "/requests", icon: ListChecks, feature: "art_request_portal" },
  { label: "Queue", to: "/queue", icon: Inbox, feature: "art_request_portal", roles: ["designer", "admin"] },
];

// INSIGHT — analytics + the knowledge graph, one entry each.
const insightNav: NavItemConfig[] = [
  { label: "Reports", to: "/reports", icon: BarChart3, feature: "reports", roles: ["designer", "admin"] },
  { label: "Explore", to: "/graph", icon: Network, roles: ["designer", "admin"] },
];

// ADMIN — everything system-facing, role-gated behind the group.
const adminNav: NavItemConfig[] = [
  { label: "Admin Tools", to: "/admin", icon: Wrench, roles: ["admin"] },
  { label: "Audit Log", to: "/audit", icon: ScrollText, feature: "audit_trail", roles: ["admin"], requireDiagnostics: true },
  { label: "Diagnostics", to: "/diagnostics", icon: Activity, roles: ["admin"], requireDiagnostics: true },
  { label: "Settings", to: "/admin/settings", icon: Settings, feature: "admin_settings", roles: ["admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile, signOut, user } = useAuth();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Brand rail header. */}
        <div
          className={`flex items-center border-b border-sidebar-border ${
            collapsed ? "justify-center px-2 py-3" : "gap-3 px-4 py-4"
          }`}
        >
          <div className="relative flex items-center justify-center shrink-0">
            <BrandLogo size="sm" className="opacity-95" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-sm font-semibold leading-tight text-sidebar-foreground truncate">
                {brand.appName}
              </h2>
              <p className="text-[11px] leading-tight text-sidebar-muted truncate">
                {brand.companyName}
              </p>
            </div>
          )}
        </div>

        {/* Workspace */}
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink to={item.url} end activeClassName="font-medium">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Art Requests */}
        <SidebarGroup>
          <SidebarGroupLabel>Art Requests</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {requestsNav.map((item) => (
                <NavItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Insight */}
        <SidebarGroup>
          <SidebarGroupLabel>Insight</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {insightNav.map((item) => (
                <NavItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin — the whole group is hidden from non-privileged users. */}
        {(profile?.is_admin || profile?.can_view_diagnostics) && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <NavItem key={item.to} item={item} collapsed={collapsed} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? "justify-center px-0" : ""}`}>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {profile?.full_name || user?.email || "User"}
              </p>
              <p className="text-xs text-sidebar-muted truncate">{user?.email}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="shrink-0 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
