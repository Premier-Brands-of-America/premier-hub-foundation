import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface StepperShellProps {
  title: string;
  steps: string[];
  current: number;
  maxReached: number;
  onJump: (index: number) => void;
  onCancel: () => void;
  children: React.ReactNode;
}

export function StepperShell({
  title, steps, current, maxReached, onJump, onCancel, children,
}: StepperShellProps) {
  const pct = Math.round(((current + 1) / steps.length) * 100);
  return (
    <div className="mx-auto max-w-6xl pb-12">
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {title} · Step {current + 1} of {steps.length}
            </p>
            <h1 className="truncate text-lg font-semibold tracking-tight">{steps[current]}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="stat-numeral hidden text-sm text-muted-foreground sm:inline">{pct}%</span>
            <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1.5">
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>
        </div>
        <Progress value={pct} className="mt-3 h-1" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        <nav aria-label="Form steps" className="md:sticky md:top-24 md:self-start">
          <ol className="space-y-0.5">
            {steps.map((label, i) => {
              const reached = i <= maxReached;
              const active = i === current;
              const done = i < current;
              return (
                <li key={label}>
                  <button
                    type="button"
                    disabled={!reached}
                    onClick={() => reached && onJump(i)}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors duration-fast",
                      active && "bg-[hsl(var(--primary)/0.10)] font-medium text-foreground",
                      !active && reached && "text-muted-foreground hover:bg-accent hover:text-foreground",
                      !reached && "cursor-not-allowed text-muted-foreground/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums transition-colors duration-fast",
                        active && "border-primary bg-primary text-primary-foreground",
                        done && "border-primary/70 bg-primary/70 text-primary-foreground",
                        !active && !done && "border-input text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    <span className="truncate">{label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
