/**
 * RequestListItem — one art request as a clickable card row, shared by My
 * Requests and the Queue. Shows the request glyph, number + title, customer,
 * status / priority pills, a color-coded due-date badge, the responsible
 * person's DiceBear portrait, and the department. Click → /requests/:id.
 */
import { Link } from "react-router-dom";
import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { EntityAvatar } from "@/components/common/EntityAvatar";
import { DueDateBadge } from "@/components/common/DueDateBadge";
import { StatusBadge, PriorityBadge } from "@/components/requests/requestBadges";
import { requestCustomer, requestLead } from "@/lib/requestMeta";
import type { ArtRequest } from "@/types/request";

export function RequestListItem({
  request,
  departmentName,
}: {
  request: ArtRequest;
  departmentName?: string | null;
}) {
  const customer = requestCustomer(request);
  const lead = requestLead(request);

  return (
    <Link
      to={`/requests/${request.id}`}
      aria-label={`${request.request_number} — ${request.title}`}
      className={cn(
        "group flex items-start gap-3 rounded-md border border-border bg-card px-3 py-3",
        "transition-colors duration-fast ease-standard outline-none",
        "hover:border-border hover:bg-accent/40",
        "focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
      )}
    >
      <EntityAvatar type="request" seed={request.id} name={request.title} size="md" className="mt-0.5 shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
            <Hash className="h-3 w-3" />
            {request.request_number}
          </span>
          {customer && (
            <span className="truncate rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground/80">
              {customer}
            </span>
          )}
        </div>

        <p className="mt-0.5 truncate text-sm font-medium text-foreground">{request.title}</p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={request.status} />
          <PriorityBadge priority={request.priority} />
          {/* Done work is done — never alarm a completed request as overdue */}
          {request.due_date && request.status !== "complete" && request.status !== "archived" && (
            <DueDateBadge due={request.due_date} />
          )}
          {departmentName && (
            <span className="text-[11px] text-muted-foreground">{departmentName}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1 pl-1" title={`${lead.title}: ${lead.name}`}>
        <EntityAvatar type="user" seed={lead.key} name={lead.name} size="sm" />
        <span className="max-w-[72px] truncate text-[10px] text-muted-foreground">{lead.name}</span>
      </div>
    </Link>
  );
}
