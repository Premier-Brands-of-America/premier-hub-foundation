import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AIChatPanel } from "@/components/AIChatPanel";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Bot, LogOut, Sparkles, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { RoleBadge } from "@/components/RoleBadge";
import { useNavigate } from "react-router-dom";
import { GlobalCommandPalette } from "@/components/search/GlobalCommandPalette";
import { SearchTrigger } from "@/components/search/SearchTrigger";
import { useDesignMode } from "@/providers/DesignModeProvider";
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
  const { mode, toggle } = useDesignMode();
  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        toggle();
        toast.success(
          mode === "modern" ? "Switched to Classic design" : "Switched to Modern design"
        );
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggle, mode]);

  const initials = (profile?.full_name ?? profile?.email ?? "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm"
        >
          Skip to main content
        </a>
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="app-header h-12 modern:h-14 flex items-center justify-between border-b border-border bg-card px-3 sm:px-4 shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger aria-label="Toggle sidebar" />
              <SearchTrigger onClick={() => setSearchOpen(true)} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => setAiOpen(!aiOpen)}
              aria-label={aiOpen ? "Close AI Assistant" : "Open AI Assistant"}
            >
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">AI Assistant</span>
            </Button>
            <div className="flex items-center gap-2 ml-auto pl-2">
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
                    <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2">
                      <UserIcon className="h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                      Appearance
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => {
                        toggle();
                        toast.success(
                          mode === "modern"
                            ? "Switched to Classic design"
                            : "Switched to Modern design"
                        );
                      }}
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Use {mode === "modern" ? "Classic" : "Modern"} design</span>
                      <kbd className="kbd ml-auto">⌘⇧D</kbd>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="gap-2">
                      <LogOut className="h-4 w-4" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </header>

          <main id="main-content" className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
            <Breadcrumbs />
            {children}
          </main>
        </div>

        {aiOpen && <AIChatPanel onClose={() => setAiOpen(false)} />}
        <GlobalCommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </SidebarProvider>
  );
}
