import { Bot, Info, ArrowUpRight } from "lucide-react";

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
    <div className={`flex flex-col items-center justify-center text-center ${isPanel ? "gap-4 px-4 py-8" : "gap-5 px-6 py-16"}`}>
      <div
        className={`flex items-center justify-center rounded-full ${isPanel ? "h-10 w-10" : "h-14 w-14"}`}
        style={{ backgroundColor: "hsl(var(--primary) / 0.10)", color: "hsl(var(--primary))" }}
        aria-hidden="true"
      >
        <Bot className={isPanel ? "h-5 w-5" : "h-7 w-7"} />
      </div>

      <div className="space-y-1.5">
        <h3 className={`font-display text-foreground ${isPanel ? "text-base" : "text-xl"}`}>
          How can I help?
        </h3>
        <p className={`mx-auto max-w-md text-muted-foreground ${isPanel ? "text-xs" : "text-sm"}`}>
          Ask about your tasks, projects, stakeholders, and activity. I read your data only — nothing gets changed.
        </p>
      </div>

      <div className={`flex w-full flex-col gap-2 ${isPanel ? "max-w-[280px]" : "max-w-md"}`}>
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onSend(q)}
            className={`group flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-muted-foreground transition-colors hover:border-[hsl(var(--primary)/0.30)] hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isPanel ? "text-xs" : "text-sm"}`}
          >
            <span className="truncate">{q}</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-[hsl(var(--primary))]" aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Info className="h-3 w-3" aria-hidden="true" />
        <span>Phase 1 — read-only. The assistant can&apos;t modify data.</span>
      </div>
    </div>
  );
}
