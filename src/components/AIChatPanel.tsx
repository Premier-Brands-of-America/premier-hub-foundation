import { X, Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface AIChatPanelProps {
  onClose: () => void;
}

export function AIChatPanel({ onClose }: AIChatPanelProps) {
  const [message, setMessage] = useState("");

  return (
    <div className="w-80 md:w-96 border-l border-border bg-card flex flex-col shrink-0 animate-slide-in">
      <div className="h-14 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-accent" />
          <span className="font-medium text-sm">AI Assistant</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Bot className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">AI Assistant coming soon.</p>
          <p className="text-xs text-muted-foreground">Ask questions about your projects and tasks.</p>
        </div>
      </div>

      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask a question..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button size="icon" className="h-9 w-9 shrink-0" disabled>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
