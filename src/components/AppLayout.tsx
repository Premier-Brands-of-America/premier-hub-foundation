import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AIChatPanel } from "@/components/AIChatPanel";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setAiOpen(!aiOpen)}
            >
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">AI Assistant</span>
            </Button>
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </div>

        {aiOpen && <AIChatPanel onClose={() => setAiOpen(false)} />}
      </div>
    </SidebarProvider>
  );
}
