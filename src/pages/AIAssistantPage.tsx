import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { AIChat } from "@/components/AIChat";

const AIAssistantPage = () => {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="AI Assistant"
        subtitle="Ask about your tasks, projects, stakeholders, and activity"
      />

      {/* Header band — the one crimson edge-rail on this screen. */}
      <header className="edge-rail mb-4 flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: "hsl(var(--primary) / 0.10)", color: "hsl(var(--primary))" }}
          aria-hidden="true"
        >
          <Bot className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl">AI Assistant</h1>
            <Badge variant="outline" className="h-5 text-[10px]">Phase 1 · Read-only</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Ask questions about your tasks, projects, stakeholders, and activity
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-hidden rounded-lg border border-border bg-card">
        <AIChat variant="page" />
      </div>
    </div>
  );
};

export default AIAssistantPage;
