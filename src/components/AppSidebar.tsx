import {
  Home,
  CheckSquare,
  FolderKanban,
  Bot,
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
  Gauge,
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

/**
 * Editorial section label — a letter-spaced caps title trailed by a hairline
 * rule, like the section index in a printed brief. Gives the rail a press-room
 * voice instead of the generic tiny-gray-caps every dashboard ships.
 */
function RuledLabel({ children }: { children: React.ReactNode }) {
  return (
    <SidebarGroupLabel className="gap-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted">
      <span className="shrink-0">{children}</span>
      <span className="h-px flex-1 bg-sidebar-border" aria-hidden />
    </SidebarGroupLabel>
  );
}

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

// INSIGHT — analytics, workload, and the knowledge graph. Workload is a
// first-class report (measuring who's drowning was a primary goal of the app),
// not just the node-size lens on the graph.
const insightNav: NavItemConfig[] = [
  // Workload IS the report: everything assigned to you and your team (requests +
  // projects + tasks), hierarchy-scoped — a manager (any role) sees their reports,
  // everyone sees their own load, admins see all. The old standalone Reports page
  // merged in here; /reports redirects to it. Open to all.
  { label: "Workload", to: "/workload", icon: Gauge, feature: "department_dashboard" },
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
              {/* Editorial masthead lockup: the brand name in the print serif,
                  the rest as a letter-spaced kicker — a wordmark, not a label. */}
              <h2 className="font-display text-lg font-semibold leading-none tracking-[-0.01em] text-sidebar-foreground truncate">
                {brand.appName.split(" ")[0]}
              </h2>
              <p className="mt-1 text-[9px] font-semibold uppercase leading-none tracking-[0.22em] text-sidebar-muted truncate">
                {brand.appName.split(" ").slice(1).join(" ") || brand.companyName}
              </p>
            </div>
          )}
        </div>

        {/* Workspace */}
        <SidebarGroup>
          <RuledLabel>Workspace</RuledLabel>
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
          <RuledLabel>Art Requests</RuledLabel>
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
          <RuledLabel>Insight</RuledLabel>
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
            <RuledLabel>Admin</RuledLabel>
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
