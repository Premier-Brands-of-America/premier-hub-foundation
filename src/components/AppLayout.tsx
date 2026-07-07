import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AIChatPanel } from "@/components/AIChatPanel";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Bot, LogOut, Moon, Rows3, Sun, User as UserIcon } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { RoleBadge } from "@/components/RoleBadge";
import { useNavigate, useLocation } from "react-router-dom";
import { GlobalCommandPalette } from "@/components/search/GlobalCommandPalette";
import { SearchTrigger } from "@/components/search/SearchTrigger";
import { useDesignMode } from "@/providers/DesignModeProvider";
import { PageHeaderProvider, usePageHeaderState } from "@/components/PageHeader";
import { ColorBar } from "@/components/pressroom";
import { titleForPath } from "@/lib/routeLabels";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [aiOpen, setAiOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme, density, setDensity } = useDesignMode();
  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleToggleTheme = () => {
    toggleTheme();
    toast.success(theme === "dark" ? "Light mode" : "Dark mode");
  };

  const handleToggleDensity = () => {
    const next = density === "compact" ? "comfortable" : "compact";
    setDensity(next);
    toast.success(next === "compact" ? "Compact density" : "Comfortable density");
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleToggleTheme();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  const initials = (profile?.full_name ?? profile?.email ?? "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SidebarProvider>
      <PageHeaderProvider>
        <div className="min-h-screen flex w-full">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm"
          >
            Skip to main content
          </a>
          <AppSidebar />

          <div className="flex-1 flex flex-col min-w-0">
            <ShellHeader
              onOpenSearch={() => setSearchOpen(true)}
              aiOpen={aiOpen}
              onToggleAi={() => setAiOpen((o) => !o)}
              theme={theme}
              density={density}
              profile={profile}
              role={role}
              initials={initials}
              onNavigate={navigate}
              onToggleTheme={handleToggleTheme}
              onToggleDensity={handleToggleDensity}
              onSignOut={handleSignOut}
            />

            {/* Signature press color-bar under the header — the calibration
                strip that runs along a press sheet, here spanning the workspace. */}
            <ColorBar height={3} className="shrink-0" />

            <main id="main-content" className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
              {children}
            </main>
          </div>

          {aiOpen && <AIChatPanel onClose={() => setAiOpen(false)} />}
          <GlobalCommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
        </div>
      </PageHeaderProvider>
    </SidebarProvider>
  );
}

type AuthProfile = ReturnType<typeof useAuth>["profile"];
type AuthRole = ReturnType<typeof useAuth>["role"];

interface ShellHeaderProps {
  onOpenSearch: () => void;
  aiOpen: boolean;
  onToggleAi: () => void;
  theme: "dark" | "light";
  density: "comfortable" | "compact";
  profile: AuthProfile;
  role: AuthRole;
  initials: string;
  onNavigate: (path: string) => void;
  onToggleTheme: () => void;
  onToggleDensity: () => void;
  onSignOut: () => void;
}

/**
 * App shell header. Left: collapse trigger + contextual page title (from
 * PageHeader context, falling back to the route label) with breadcrumbs.
 * Right: primary-action slot, then ⌘K search, AI Assistant, notifications,
 * and the account menu (theme ⌘⇧D / density / profile / sign out).
 */
function ShellHeader({
  onOpenSearch,
  aiOpen,
  onToggleAi,
  theme,
  density,
  profile,
  role,
  initials,
  onNavigate,
  onToggleTheme,
  onToggleDensity,
  onSignOut,
}: ShellHeaderProps) {
  const { pathname } = useLocation();
  const { title, subtitle, actions } = usePageHeaderState();
  const heading = title ?? titleForPath(pathname);

  return (
    <header className="app-header h-14 flex items-center gap-3 px-3 sm:px-4 shrink-0">
      {/* Left: collapse + contextual title / breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger aria-label="Toggle sidebar" />
        <div className="hidden sm:block h-5 w-px bg-border/70" aria-hidden="true" />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h1 className="font-display text-[22px] font-medium leading-none tracking-[-0.01em] text-foreground truncate">
              {heading}
            </h1>
            {subtitle && (
              <span className="hidden md:inline text-xs text-muted-foreground truncate">
                {subtitle}
              </span>
            )}
          </div>
          <div className="mt-1 hidden sm:block">
            <Breadcrumbs />
          </div>
        </div>
      </div>

      {/* Right: primary action + search + assistant + notifications + account */}
      <div className="flex items-center gap-1 ml-auto pl-2">
        {actions && <div className="mr-1 flex items-center gap-2">{actions}</div>}
        <SearchTrigger onClick={onOpenSearch} />
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground hover:bg-foreground/5"
          onClick={onToggleAi}
          aria-label={aiOpen ? "Close AI Assistant" : "Open AI Assistant"}
        >
          <Bot className="h-4 w-4" />
          <span className="hidden lg:inline text-xs">AI Assistant</span>
        </Button>
        <NotificationBell />
        {profile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Account menu"
              >
                <span className="hidden sm:inline text-xs text-muted-foreground">
                  {profile.full_name}
                </span>
                <span className="hidden sm:inline-flex">
                  <RoleBadge role={role} />
                </span>
                <Avatar className="h-7 w-7">
                  <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name ?? ""} />
                  <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="flex flex-col">
                <span className="text-sm">{profile.full_name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {profile.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onNavigate("/profile")} className="gap-2">
                <UserIcon className="h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Appearance
              </DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  onToggleTheme();
                }}
                className="gap-2"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                <kbd className="kbd ml-auto">⌘⇧D</kbd>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  onToggleDensity();
                }}
                className="gap-2"
                aria-label={
                  density === "compact"
                    ? "Switch to comfortable density"
                    : "Switch to compact density"
                }
              >
                <Rows3 className="h-4 w-4" />
                <span>{density === "compact" ? "Comfortable density" : "Compact density"}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
