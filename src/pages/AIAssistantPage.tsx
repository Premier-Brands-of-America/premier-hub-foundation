import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AIChat } from "@/components/AIChat";

const AIAssistantPage = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
          <Bot className="h-5 w-5 text-accent" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">AI Assistant</h1>
            <Badge variant="outline" className="text-[10px] h-5">Phase 1 · Read-only</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Ask questions about your tasks, projects, stakeholders, and activity
          </p>
        </div>
      </div>
      <div className="flex-1 border border-border rounded-lg overflow-hidden bg-card">
        <AIChat variant="page" />
      </div>
    </div>
  );
};

export default AIAssistantPage;
