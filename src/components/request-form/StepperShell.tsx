import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

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
  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b -mx-4 px-4 py-3 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">{title} — Step {current + 1} of {steps.length}</h1>
            <p className="text-xs text-muted-foreground">{steps[current]}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        </div>
        <Progress value={((current + 1) / steps.length) * 100} className="mt-3 h-1.5" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <nav aria-label="Form steps" className="md:sticky md:top-24 md:self-start">
          <ol className="space-y-1">
            {steps.map((label, i) => {
              const reached = i <= maxReached;
              const active = i === current;
              return (
                <li key={label}>
                  <button
                    type="button"
                    disabled={!reached}
                    onClick={() => reached && onJump(i)}
                    className={cn(
                      "w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                      active && "bg-primary/10 text-foreground font-medium",
                      !active && reached && "hover:bg-muted text-foreground",
                      !reached && "text-muted-foreground cursor-not-allowed opacity-60",
                    )}
                  >
                    <span className={cn(
                      "h-5 w-5 rounded-full text-xs flex items-center justify-center border",
                      active ? "bg-primary text-primary-foreground border-primary" :
                      i < current ? "bg-primary/80 text-primary-foreground border-primary/80" :
                      "border-input",
                    )}>
                      {i < current ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    {label}
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