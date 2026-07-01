import { useEffect } from "react";
import { CalendarDays, ExternalLink, Loader2, Plug } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { isPreviewEnvironment } from "@/lib/environment";
import {
  useBackgroundCalendarSync,
  useCalendarEventsInRange,
  useConnectOutlook,
  useOutlookConnection,
} from "@/components/integrations/outlook/hooks";
import type { CalendarEvent } from "@/components/integrations/outlook/outlook-api";

/**
 * Calendar (today) card.
 *
 * Reads the Outlook integration's real `calendar_events` (RLS-scoped) for TODAY
 * when the user has an `ms_connections` row and renders a time-sorted agenda of
 * the day's meetings (start–end · subject · join link). Shows the "Connect
 * Outlook" empty state ONLY when not connected; once connected it renders the
 * real (possibly empty) day and triggers a background `calendar-sync` so events
 * populate. In preview it shows a small demo agenda for today so the dashboard
 * stays alive.
 */

const IS_PREVIEW = isPreviewEnvironment();

/** Local 00:00 today → 00:00 tomorrow. */
function todayBounds(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
}

/** A couple of demo meetings for the preview dashboard — all TODAY. */
function demoTodayEvents(start: Date): CalendarEvent[] {
  const at = (hour: number, min = 0) => {
    const d = new Date(start);
    d.setHours(hour, min, 0, 0);
    return d.toISOString();
  };
  return [
    { id: "demo-1", ms_event_id: "demo-1", subject: "Design review", join_web_url: "https://teams.microsoft.com/l/meetup-join/demo-1", start_at: at(10), end_at: at(11), project_id: null },
    { id: "demo-2", ms_event_id: "demo-2", subject: "1:1 with manager", join_web_url: null, start_at: at(13, 30), end_at: at(14), project_id: null },
    { id: "demo-3", ms_event_id: "demo-3", subject: "Art request triage", join_web_url: "https://teams.microsoft.com/l/meetup-join/demo-3", start_at: at(15), end_at: at(15, 30), project_id: null },
  ];
}

/** Format an event's time range, e.g. "10:00 AM – 11:00 AM" (or just the start). */
function timeRange(ev: CalendarEvent): string {
  if (!ev.start_at) return "No time";
  const start = format(new Date(ev.start_at), "h:mm a");
  if (!ev.end_at) return start;
  return `${start} – ${format(new Date(ev.end_at), "h:mm a")}`;
}

export function CalendarTodayCard() {
  const { start, end } = todayBounds();

  const connectionQuery = useOutlookConnection();
  const connect = useConnectOutlook();
  const bgSync = useBackgroundCalendarSync();
  const connected = !!connectionQuery.data;

  const eventsQuery = useCalendarEventsInRange(
    start.toISOString(),
    end.toISOString(),
    !IS_PREVIEW && connected,
  );

  // Once connected, pull the latest events in the background so today fills in.
  useEffect(() => {
    if (!IS_PREVIEW && connected && !bgSync.isPending && !bgSync.isSuccess) {
      bgSync.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const events: CalendarEvent[] = (IS_PREVIEW
    ? demoTodayEvents(start)
    : eventsQuery.data ?? []
  )
    .slice()
    .sort((a, b) => (a.start_at ?? "").localeCompare(b.start_at ?? ""));

  const showConnect = !IS_PREVIEW && !connected && !connectionQuery.isLoading;

  return (
    <div className="space-y-3">
      {showConnect ? (
        <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span>Connect Outlook to see your day</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Today's meetings will appear here once your calendar is linked.
          </p>
          <Button
            variant="tinted"
            size="sm"
            className="gap-1.5"
            onClick={() => connect.mutate()}
            disabled={connect.isPending}
          >
            {connect.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plug className="h-3.5 w-3.5" />
            )}
            Connect Outlook
          </Button>
        </div>
      ) : eventsQuery.isLoading || bgSync.isPending ? (
        <p className="px-1 text-xs text-muted-foreground">Loading today's meetings…</p>
      ) : events.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">No meetings today</p>
      ) : (
        <ul className="space-y-1.5">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-1.5"
            >
              <div className="min-w-0">
                <div className="text-[10px] tabular-nums text-muted-foreground">
                  {timeRange(ev)}
                </div>
                <div className="truncate text-xs font-medium text-foreground">
                  {ev.subject ?? "(untitled)"}
                </div>
              </div>
              {ev.join_web_url && (
                <Button asChild variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                  <a href={ev.join_web_url} target="_blank" rel="noopener noreferrer" aria-label="Join meeting">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Back-compat alias: the card was renamed from CalendarWeekCard → CalendarTodayCard. */
export const CalendarWeekCard = CalendarTodayCard;
