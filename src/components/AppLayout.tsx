import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AIChatPanel } from "@/components/AIChatPanel";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Bot, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { RoleBadge } from "@/components/RoleBadge";
import { useNavigate } from "react-router-dom";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [aiOpen, setAiOpen] = useState(false);
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

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
          <header className="h-12 flex items-center justify-between border-b border-border bg-card px-3 sm:px-4 shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger aria-label="Toggle sidebar" />
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
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{profile.full_name}</span>
                  <RoleBadge role={role} />
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Sign out</span>
              </Button>
            </div>
          </header>

          <main id="main-content" className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
            <Breadcrumbs />
            {children}
          </main>
        </div>

        {aiOpen && <AIChatPanel onClose={() => setAiOpen(false)} />}
      </div>
    </SidebarProvider>
  );
}
