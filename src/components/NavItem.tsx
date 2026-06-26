import { useFeatureFlagsContext } from "@/providers/FeatureFlagsProvider";
import { useRole, type Role } from "@/hooks/useRole";
import type { FeatureKey } from "@/lib/featureKeys";
import { NavLink } from "@/components/NavLink";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

export interface NavItemConfig {
  label: string;
  to: string;
  icon: LucideIcon;
  feature?: FeatureKey;
  roles?: Role[];
}

export function NavItem({ item, collapsed }: { item: NavItemConfig; collapsed: boolean }) {
  const role = useRole();
  const location = useLocation();
  const { flags, loading } = useFeatureFlagsContext();
  const featureOk = item.feature ? !loading && flags[item.feature] === true : true;
  const roleOk = item.roles ? !!role && item.roles.includes(role) : true;
  if (!featureOk || !roleOk) return null;

  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={location.pathname === item.to} tooltip={item.label}>
        <NavLink to={item.to} end activeClassName="font-medium">
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{item.label}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
