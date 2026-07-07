import { cn } from "@/lib/utils";

export interface Kpi {
  value: number | string;
  label: string;
  /** Optional token for the value color (e.g. --status-danger for overdue). */
  token?: string;
  onClick?: () => void;
  active?: boolean;
  /** Optional "?" contextual-help tooltip rendered after the label. */
  hint?: React.ReactNode;
}

/**
 * Inline, body-size, clickable KPI strip — replaces the old three-number
 * stat billboards. Each segment can filter the list below it. Digits use
 * tabular Inter (never the display face at this size).
 */
export function KpiStrip({ items, className }: { items: Kpi[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-sm", className)}>
      {items.map((k, i) => {
        const inner = (
          <>
            <span
              className="font-semibold tabular-nums"
              style={k.token ? { color: `hsl(var(${k.token}))` } : undefined}
            >
              {k.value}
            </span>{" "}
            <span className="text-muted-foreground">{k.label}</span>
          </>
        );
        return (
          <span key={i} className="inline-flex items-center gap-1">
            {i > 0 && <span className="mr-3 text-border" aria-hidden>·</span>}
            {k.onClick ? (
              <button
                type="button"
                onClick={k.onClick}
                className={cn(
                  "rounded px-1 -mx-1 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  k.active && "bg-accent",
                )}
              >
                {inner}
              </button>
            ) : (
              inner
            )}
            {k.hint}
          </span>
        );
      })}
    </div>
  );
}
