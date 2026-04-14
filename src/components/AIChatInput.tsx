import { Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  isLoading: boolean;
  hasMessages: boolean;
  variant: "panel" | "page";
}

export function AIChatInput({ input, onInputChange, onSubmit, onClear, isLoading, hasMessages, variant }: AIChatInputProps) {
  const isPanel = variant === "panel";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={`border-t border-border ${isPanel ? "p-2.5" : "p-3 md:p-4"}`}>
      {hasMessages && (
        <div className="flex justify-end mb-1.5">
          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-muted-foreground" onClick={onClear}>
            <Trash2 className="h-3 w-3" /> Clear chat
          </Button>
        </div>
      )}
      <form onSubmit={handleSubmit} className={`flex gap-2 ${isPanel ? "" : "max-w-3xl mx-auto"}`}>
        <input
          type="text"
          placeholder="Ask about your tasks, projects, activity..."
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className={`flex-1 px-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 ${
            isPanel ? "h-8 text-xs" : "h-10 text-sm"
          }`}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isLoading}
          className={isPanel ? "h-8 w-8" : "h-10 w-10"}
        >
          <Send className={isPanel ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </Button>
      </form>
    </div>
  );
}
