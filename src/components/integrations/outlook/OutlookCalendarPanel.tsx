// ============================================================================
// OutlookCalendarPanel — Outlook calendar + email on a project page (OUTLOOK)
// ----------------------------------------------------------------------------
// The "beat-Notion" surface: deep calendar↔project linking (which Notion's
// connector lacks) plus parity email search, in one tabbed panel. Reads
// calendar_events via TanStack Query (RLS-scoped); gates behind a graceful
// "Connect Outlook" empty state when the user has no ms_connections row.
// Semantic tokens only.
// ============================================================================

import { useEffect } from "react";
import {
  Calendar,
  CalendarDays,
  ExternalLink,
  Link2,
  Loader2,
  Mail,
  Plug,
  RefreshCw,
  Unlink,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { OutlookEmailSearch } from "./OutlookEmailSearch";
import {
  useConnectOutlook,
  useLinkEvent,
  useOutlookConnection,
  useProjectCalendarEvents,
  useSyncCalendar,
  useUnlinkedEvents,
} from "./hooks";
import type { CalendarEvent } from "./outlook-api";

interface Props {
  projectId: string;
}

function fmt(dt: string | null): string {
  if (!dt) return "No date";
  const d = new Date(dt);
  return isNaN(d.getTime()) ? "No date" : format(d, "EEE MMM d · h:mm a");
}

export function OutlookCalendarPanel({ projectId }: Props) {
  const qc = useQueryClient();
  const connectionQuery = useOutlookConnection();
  const connect = useConnectOutlook();

  // Surface the result of the OAuth round-trip when we land back on this page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("outlook");
    if (!status) return;
    if (status === "connected") {
      toast.success("Outlook connected");
      qc.invalidateQueries({ queryKey: ["outlook", "connection"] });
    } else if (status === "error") {
      toast.error("Couldn't connect Outlook. Please try again.");
    }
    params.delete("outlook");
    const search = params.toString();
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (search ? `?${search}` : "") + window.location.hash,
    );
  }, [qc]);

  const connected = !!connectionQuery.data;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" /> Outlook
        </CardTitle>
      </CardHeader>
      <CardContent>
        {connectionQuery.isLoading ? (
          <p className="text-xs text-muted-foreground">Checking Outlook connection…</p>
        ) : !connected ? (
          <EmptyState
            icon={<Plug className="h-5 w-5" />}
            title="Connect Outlook"
            description="Link your Microsoft account to see this project's meetings and search email."
            action={
              <Button size="sm" onClick={() => connect.mutate()} disabled={connect.isPending}>
                {connect.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plug className="mr-2 h-4 w-4" />
                )}
                Connect Outlook
              </Button>
            }
          />
        ) : (
          <Tabs defaultValue="calendar">
            <TabsList className="mb-3">
              <TabsTrigger value="calendar" className="gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Calendar
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar">
              <CalendarTab projectId={projectId} />
            </TabsContent>
            <TabsContent value="email">
              <OutlookEmailSearch />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

function CalendarTab({ projectId }: Props) {
  const linkedQuery = useProjectCalendarEvents(projectId);
  const unlinkedQuery = useUnlinkedEvents();
  const sync = useSyncCalendar(projectId);
  const link = useLinkEvent(projectId);

  const linked = linkedQuery.data ?? [];
  const unlinked = unlinkedQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {linked.length} linked meeting{linked.length === 1 ? "" : "s"}
        </p>
        <Button variant="outline" size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
          {sync.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync
        </Button>
      </div>

      {/* Linked meetings */}
      {linked.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No meetings linked yet. Sync your calendar, then link a meeting below.
        </p>
      ) : (
        <ul className="space-y-2">
          {linked.map((ev) => (
            <li
              key={ev.id}
              className="flex items-start justify-between gap-2 rounded-md border bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{ev.subject ?? "(untitled)"}</div>
                <div className="text-[11px] text-muted-foreground">{fmt(ev.start_at)}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {ev.join_web_url && (
                  <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                    <a
                      href={ev.join_web_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open meeting"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Unlink meeting"
                  disabled={link.isPending}
                  onClick={() => link.mutate({ event_id: ev.id, project_id: null })}
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Link a meeting */}
      {unlinked.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Link a meeting</p>
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {unlinked.map((ev: CalendarEvent) => (
              <div
                key={ev.id}
                className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm">{ev.subject ?? "(untitled)"}</div>
                  <div className="text-[11px] text-muted-foreground">{fmt(ev.start_at)}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={link.isPending}
                  onClick={() => link.mutate({ event_id: ev.id, project_id: projectId })}
                >
                  <Link2 className="mr-1.5 h-3.5 w-3.5" /> Link
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
