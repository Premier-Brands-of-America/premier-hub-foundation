import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Crown,
  Globe,
  Archive,
  Bot,
  BarChart3,
  Settings,
  LogOut,
  FilePlus,
  Inbox,
  ListChecks,
  Users2,
  ScrollText,
  FileType2,
  CalendarRange,
  Network,
  KanbanSquare,
  Share2,
  Brain,
  Wrench,
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

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "My Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Planner", url: "/planner", icon: KanbanSquare },
  { title: "Pages", url: "/pages", icon: FileType2 },
  { title: "Timeline", url: "/timeline", icon: CalendarRange },
  { title: "My Assigned Projects", url: "/assigned-projects", icon: FolderKanban },
  { title: "Projects I Own", url: "/owned-projects", icon: Crown },
  { title: "All Public Projects", url: "/public-projects", icon: Globe },
  { title: "Completed Projects", url: "/completed-projects", icon: Archive },
];

const toolsNav = [
  { title: "AI Assistant", url: "/ai-assistant", icon: Bot },
  { title: "Graph", url: "/graph", icon: Network, requiresStaff: true },
  { title: "Org", url: "/org", icon: Share2 },
  { title: "Memory", url: "/memory", icon: Brain },
  { title: "Diagnostics", url: "/diagnostics", icon: BarChart3, requiresDiagnostics: true },
];

// Art Department Requests — request-portal items only.
const portalNav: NavItemConfig[] = [
  { label: "Submit Art Request", to: "/requests/new", icon: FilePlus, feature: "art_request_portal", roles: ["requester", "designer", "admin"] },
  { label: "My Requests", to: "/requests", icon: ListChecks, feature: "art_request_portal" },
  { label: "Queue", to: "/queue", icon: Inbox, feature: "art_request_portal", roles: ["designer", "admin"] },
  { label: "Department Workload", to: "/workload", icon: Users2, feature: "department_dashboard", roles: ["admin"] },
  { label: "Reports", to: "/reports", icon: BarChart3, feature: "reports", roles: ["designer", "admin"] },
];

// Administration — admin tooling + the app-wide Audit Log (also visible to
// diagnostics users); Settings is admin-only.
const adminNav: NavItemConfig[] = [
  { label: "Admin Tools", to: "/admin", icon: Wrench, roles: ["admin"] },
  { label: "Audit Log", to: "/audit", icon: ScrollText, feature: "audit_trail", roles: ["admin"], requireDiagnostics: true },
  { label: "Settings", to: "/admin/settings", icon: Settings, feature: "admin_settings", roles: ["admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile, signOut, user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Brand — a premium product rail header. The crimson hairline under
            the logo echoes the signature edge-rail. */}
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

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
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

        {/* Art Department Requests */}
        <SidebarGroup>
          <SidebarGroupLabel>Art Department Requests</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {portalNav.map((item) => (
                <NavItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools */}
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsNav
                .filter((item) => {
                  if ((item as any).requiresDiagnostics) {
                    return profile?.is_admin || profile?.can_view_diagnostics;
                  }
                  if ((item as any).requiresStaff) {
                    return profile?.is_admin || profile?.role === "designer" || profile?.role === "admin";
                  }
                  return true;
                })
                .map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
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

        {/* Administration — admin tooling + the app-wide Audit Log (admin or
            diagnostics). Per-item gating lives in NavItem. */}
        {(profile?.is_admin || profile?.can_view_diagnostics) && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
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
              <p className="text-xs text-sidebar-muted truncate">
                {user?.email}
              </p>
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
