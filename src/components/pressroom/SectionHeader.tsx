import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * A section band: microlabel + count + optional icon on the left, a quiet
 * "→" action on the right. One rhythm for every zone on Home / list pages.
 */
export function SectionHeader({
  icon: Icon,
  label,
  count,
  tone,
  action,
  className,
}: {
  icon?: LucideIcon;
  label: string;
  count?: number | string;
  /** Token to tint the label + count (e.g. --status-danger for "Needs attention"). */
  tone?: string;
  action?: { label: string; to?: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2 px-1", className)}>
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon
            className="h-3.5 w-3.5"
            style={tone ? { color: `hsl(var(${tone}))` } : undefined}
            aria-hidden
          />
        )}
        <span
          className="text-[11px] font-medium uppercase tracking-[0.08em]"
          style={{ color: tone ? `hsl(var(${tone}))` : "hsl(var(--muted-foreground))" }}
        >
          {label}
        </span>
        {count !== undefined && count !== "" && (
          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">{count}</span>
        )}
      </div>
      {action &&
        (action.to ? (
          <Link
            to={action.to}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {action.label} →
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {action.label} →
          </button>
        ))}
    </div>
  );
}
