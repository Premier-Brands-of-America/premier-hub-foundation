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
    <div className={`border-t border-border bg-card ${isPanel ? "p-2.5" : "p-3 md:p-4"}`}>
      {hasMessages && (
        <div className="mb-1.5 flex justify-end">
          <Button variant="ghost" size="sm" className="h-6 gap-1 text-[11px] text-muted-foreground hover:text-foreground" onClick={onClear}>
            <Trash2 className="h-3 w-3" /> Clear chat
          </Button>
        </div>
      )}
      <form onSubmit={handleSubmit} className={`flex gap-2 ${isPanel ? "" : "mx-auto max-w-3xl"}`}>
        <input
          type="text"
          placeholder="Ask about your tasks, projects, activity…"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className={`flex-1 rounded-md border border-transparent bg-muted/40 px-3 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 disabled:opacity-50 ${
            isPanel ? "h-8 text-xs" : "h-10 text-sm"
          }`}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isLoading}
          aria-label="Send message"
          className={isPanel ? "h-8 w-8 shrink-0" : "h-10 w-10 shrink-0"}
        >
          <Send className={isPanel ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </Button>
      </form>
    </div>
  );
}
