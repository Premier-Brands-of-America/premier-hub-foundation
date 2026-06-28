/**
 * Shared status / priority / type pills for the Art Request Portal.
 * Presentation-only token mapping (status / priority → semantic color token),
 * reused across My Requests, Queue, Workload, and the Request detail view so the
 * whole portal speaks one visual language (NexoString dark + token hues).
 */
import type { RequestPriority, RequestStatus } from "@/types/request";

// status / priority → semantic color token (CSS var name).
export const STATUS_TOKEN: Record<RequestStatus, string> = {
  submitted: "--status-info",
  in_review: "--status-info",
  assigned: "--entity-task",
  in_progress: "--status-warning",
  waiting_on_info: "--status-warning",
  internal_review: "--entity-request",
  sent_for_approval: "--entity-request",
  complete: "--status-done",
  archived: "--muted-foreground",
};

export const PRIORITY_TOKEN: Record<RequestPriority, string> = {
  low: "--priority-low",
  medium: "--priority-medium",
  high: "--priority-high",
  urgent: "--priority-urgent",
};

/** "in_progress" → "in progress" */
export function prettyLabel(value: string): string {
  return value.replace(/_/g, " ");
}

export function TokenBadge({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium capitalize"
      style={{
        backgroundColor: `hsl(var(${token}) / 0.14)`,
        color: `hsl(var(${token}))`,
      }}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <TokenBadge token={STATUS_TOKEN[status]}>{prettyLabel(status)}</TokenBadge>;
}

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  return <TokenBadge token={PRIORITY_TOKEN[priority]}>{priority}</TokenBadge>;
}

/** Small neutral pill for the request type ("easy" / "full brief"). */
export function TypeBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
      {children}
    </span>
  );
}
