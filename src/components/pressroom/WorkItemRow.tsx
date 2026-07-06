import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { EntityAvatar } from "@/components/common/EntityAvatar";
import { dueLabel, dueUrgency } from "@/lib/dueDate";
import { ProofChip } from "./ProofChip";
import { isTerminal, type ProofState } from "./proofState";

export interface WorkItemRowProps {
  /** Destination when the whole row is a link. Omit for a non-navigating row. */
  to?: string;
  title: string;
  state?: ProofState;
  /** Project / brand chip text. */
  context?: string | null;
  dueDate?: string | null;
  /** Assignee for the trailing avatar. */
  assignee?: { name: string; seed?: string } | null;
  /** Short machine id (ART-1002, TSK-478) rendered in mono. */
  code?: string | null;
  /** Leading control — a checkbox for tasks, a status dot otherwise. */
  leading?: React.ReactNode;
  /** Trailing hover actions (buttons). */
  actions?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  /** Dim + strike a completed row. */
  done?: boolean;
}

const DUE_TOKEN: Record<string, string> = {
  overdue: "--status-danger",
  soon: "--status-warning",
  normal: "--muted-foreground",
  none: "--muted-foreground",
};

/**
 * The atom of the redesign: one dense, glanceable row carrying
 * leading · title · context · status · due · assignee · id · actions.
 * Meets the "Queue standard" — if a row can't show due + owner + status,
 * it doesn't ship. 44px comfortable height.
 */
export const WorkItemRow = forwardRef<HTMLDivElement, WorkItemRowProps>(function WorkItemRow(
  { to, title, state, context, dueDate, assignee, code, leading, actions, onClick, className, done },
  ref,
) {
  const urgency = dueDate ? dueUrgency(dueDate) : "none";
  const showDue = dueDate && !(state && isTerminal(state));

  const body = (
    <>
      {leading && <span className="flex shrink-0 items-center">{leading}</span>}
      <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", done && "text-muted-foreground line-through")}>
        {title}
      </span>
      {context && (
        <span className="hidden shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground sm:inline">
          {context}
        </span>
      )}
      {state && <ProofChip state={state} className="hidden shrink-0 sm:inline-flex" />}
      {showDue && (
        <span
          className="hidden shrink-0 text-xs font-medium tabular-nums md:inline"
          style={{ color: `hsl(var(${DUE_TOKEN[urgency]}))` }}
        >
          {dueLabel(dueDate)}
        </span>
      )}
      {assignee && (
        <EntityAvatar type="user" seed={assignee.seed ?? assignee.name} name={assignee.name} size="sm" />
      )}
      {code && <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground lg:inline">{code}</span>}
      {actions && (
        <span className="ml-1 hidden shrink-0 items-center gap-1 group-hover:flex">{actions}</span>
      )}
    </>
  );

  const shared = cn(
    "group flex min-h-[44px] items-center gap-2.5 rounded-lg border border-transparent px-3 py-1.5",
    "transition-colors hover:border-border hover:bg-accent/40",
    className,
  );

  if (to) {
    return (
      <Link ref={ref as never} to={to} className={shared}>
        {body}
      </Link>
    );
  }
  return (
    <div
      ref={ref}
      className={cn(shared, onClick && "cursor-pointer")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
    >
      {body}
    </div>
  );
});
