import { Bot, Info } from "lucide-react";

const EXAMPLE_QUESTIONS = [
  "What projects am I assigned to?",
  "Which of my tasks are overdue?",
  "Summarize my recent activity",
  "Who owns the most projects?",
];

interface AIChatEmptyStateProps {
  variant: "panel" | "page";
  onSend: (question: string) => void;
}

export function AIChatEmptyState({ variant, onSend }: AIChatEmptyStateProps) {
  const isPanel = variant === "panel";

  return (
    <div className={`flex flex-col items-center justify-center ${isPanel ? "py-8 px-4" : "py-16 px-6"} text-center space-y-4`}>
      <div className={`${isPanel ? "w-10 h-10" : "w-14 h-14"} rounded-full bg-accent/10 flex items-center justify-center`}>
        <Bot className={`${isPanel ? "h-5 w-5" : "h-7 w-7"} text-accent`} />
      </div>
      <div className="space-y-1">
        <h3 className={`font-semibold text-foreground ${isPanel ? "text-sm" : "text-lg"}`}>
          AI Assistant
        </h3>
        <p className={`text-muted-foreground ${isPanel ? "text-xs" : "text-sm"} max-w-md`}>
          Ask questions about your tasks, projects, stakeholders, and activity. I can only read data — no changes will be made.
        </p>
      </div>
      <div className={`flex flex-wrap gap-2 justify-center ${isPanel ? "max-w-[280px]" : "max-w-lg"}`}>
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onSend(q)}
            className={`text-left px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted hover:border-muted-foreground/30 transition-colors ${isPanel ? "text-[11px]" : "text-xs"}`}
          >
            {q}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-2">
        <Info className="h-3 w-3" />
        <span>Phase 1 — Read-only assistant. Cannot modify data.</span>
      </div>
    </div>
  );
}
