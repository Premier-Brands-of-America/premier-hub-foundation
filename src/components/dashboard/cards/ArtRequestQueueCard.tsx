import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FilePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isPreviewEnvironment } from "@/lib/environment";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/common/EntityAvatar";
import type { WidgetConfig } from "../types";
import { CardLoading, CardError, CardEmpty } from "./card-states";

const IS_PREVIEW = isPreviewEnvironment();

const PRIORITY_TOKEN: Record<string, string> = {
  low: "var(--priority-low)",
  medium: "var(--priority-medium)",
  high: "var(--priority-high)",
  urgent: "var(--priority-urgent)",
};

interface RequestRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  request_number: string | null;
}

function prettyStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export function ArtRequestQueueCard({ config }: { config: WidgetConfig }) {
  const { user, profile, role } = useAuth();
  const userId = user?.id ?? profile?.user_id;
  const limit = config.limit ?? 6;
  const navigate = useNavigate();

  // Role decides the slice: requesters see their own; designers see their
  // assignments; admins see the open queue.
  const view = role === "requester" ? "mine" : role === "designer" ? "assigned" : "queue";

  const query = useQuery({
    queryKey: ["dashboard-card", "art-request-queue", view, userId, limit],
    enabled: !!userId,
    queryFn: async (): Promise<RequestRow[]> => {
      if (!userId) return [];
      if (IS_PREVIEW) {
        // Preview reads the same demo store as /requests and /queue — the home
        // screen and the queue must never disagree about the same open work.
        const { listQueue } = await import("@/services/requests");
        // Demo queue already excludes complete/archived (same filter as prod).
        const open = await listQueue();
        const scoped =
          view === "mine"
            ? open.filter((r) => r.requester_id === userId)
            : view === "assigned"
              ? open.filter((r) => r.assignee_id === userId)
              : open;
        // Mirror prod ordering per view: newest-first for "mine", otherwise
        // priority desc (text order, as in prod) then due date asc, nulls last.
        const sorted = [...scoped].sort((a, b) =>
          view === "mine"
            ? b.created_at.localeCompare(a.created_at)
            : (view === "queue" ? b.priority.localeCompare(a.priority) : 0) ||
              (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"),
        );
        return sorted.slice(0, limit).map((r) => ({
          id: r.id,
          title: r.title,
          status: r.status,
          priority: r.priority,
          request_number: r.request_number,
        }));
      }
      const base = supabase
        .from("requests")
        .select("id, title, status, priority, request_number");
      const res =
        view === "mine"
          ? await base
              .eq("requester_id", userId)
              .order("created_at", { ascending: false })
              .limit(limit)
          : view === "assigned"
            ? await base
                .eq("assignee_id", userId)
                .not("status", "in", "(complete,archived)")
                .order("due_date", { ascending: true, nullsFirst: false })
                .limit(limit)
            : await base
                .not("status", "in", "(complete,archived)")
                .order("priority", { ascending: false })
                .order("due_date", { ascending: true, nullsFirst: false })
                .limit(limit);
      if (res.error) throw res.error;
      return res.data ?? [];
    },
  });

  if (query.isLoading) return <CardLoading />;
  if (query.isError) return <CardError onRetry={() => query.refetch()} />;

  const rows = query.data ?? [];
  const target = view === "mine" ? "/requests" : "/queue";

  if (rows.length === 0) {
    return (
      <CardEmpty
        message={
          view === "mine"
            ? "No requests submitted"
            : view === "assigned"
              ? "No assignments"
              : "Queue is clear"
        }
        hint={
          view === "mine"
            ? "Submit an art request to get started."
            : "New work will appear here."
        }
        action={
          view === "mine" ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/requests/new")}
            >
              <FilePlus className="h-3 w-3" /> New Request
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-1">
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => navigate(`/requests/${r.id}`)}
              className="group flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left hover:bg-accent"
            >
              <EntityAvatar type="request" seed={r.id} name={r.title} src={(r as any).icon} size="xs" />
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: `hsl(${PRIORITY_TOKEN[r.priority] ?? "var(--status-neutral)"})` }}
                title={`${r.priority} priority`}
              />
              <span className="flex-1 truncate text-sm text-foreground">{r.title}</span>
              <span className="shrink-0 text-xs capitalize text-muted-foreground">
                {prettyStatus(r.status)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => navigate(target)}
      >
        View all <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  );
}
