/** Small, shared loading / empty / error states for dashboard card bodies. */
import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function CardLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <Skeleton className="h-3.5 w-3.5 rounded-full shrink-0" />
          <Skeleton className="h-3.5 flex-1" style={{ maxWidth: `${90 - i * 12}%` }} />
        </div>
      ))}
    </div>
  );
}

export function CardError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 py-1">
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Couldn't load this card.</span>
      </div>
      {onRetry && (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function CardEmpty({
  message,
  hint,
  action,
}: {
  message: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="space-y-2 py-1">
      <p className="text-sm text-foreground">{message}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {action}
    </div>
  );
}
