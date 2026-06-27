/** Small, shared loading / empty / error states for dashboard card bodies. */
import { AlertCircle, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function CardLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
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
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium text-foreground">Couldn't load this card.</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="h-7 px-3 text-xs" onClick={onRetry}>
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
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-muted/60 text-muted-foreground">
        <Inbox className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{message}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
