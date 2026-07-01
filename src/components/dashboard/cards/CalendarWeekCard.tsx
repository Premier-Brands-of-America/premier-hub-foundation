import { useEffect } from "react";
import { CalendarDays, ExternalLink, Loader2, Plug } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isPreviewEnvironment } from "@/lib/environment";
import {
  useBackgroundCalendarSync,
  useCalendarEventsInRange,
  useConnectOutlook,
  useOutlookConnection,
} from "@/components/integrations/outlook/hooks";
import type { CalendarEvent } from "@/components/integrations/outlook/outlook-api";

/**
 * Calendar (this week) card.
 *
 * Reads the Outlook integration's real `calendar_events` (RLS-scoped) for the
 * current week when the user has an `ms_connections` row. Shows the "Connect
 * Outlook" empty state ONLY when not connected; once connected it renders the
 * real (possibly empty) week and triggers a background `calendar-sync` so events
 * populate. In preview it shows a small demo week so the dashboard stays alive.
 */

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const IS_PREVIEW = isPreviewEnvironment();

/** Monday 00:00 (local) of the current week, and the following Monday 00:00. */
function weekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun..6=Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

function weekDays(start: Date): { label: string; date: number; iso: string; isToday: boolean }[] {
  const today = new Date().toDateString();
  return DAY_LABELS.map((label, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      label,
      date: d.getDate(),
      iso: d.toDateString(),
      isToday: d.toDateString() === today,
    };
  });
}

/** A couple of demo events for the preview dashboard. */
function demoWeekEvents(start: Date): CalendarEvent[] {
  const at = (dayOffset: number, hour: number) => {
    const d = new Date(start);
    d.setDate(start.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  return [
    { id: "demo-1", ms_event_id: "demo-1", subject: "Design review", join_web_url: null, start_at: at(1, 10), end_at: at(1, 11), project_id: null },
    { id: "demo-2", ms_event_id: "demo-2", subject: "1:1 with manager", join_web_url: null, start_at: at(3, 14), end_at: at(3, 15), project_id: null },
  ];
}

export function CalendarWeekCard() {
  const { start, end } = weekBounds();
  const days = weekDays(start);

  const connectionQuery = useOutlookConnection();
  const connect = useConnectOutlook();
  const bgSync = useBackgroundCalendarSync();
  const connected = !!connectionQuery.data;

  const eventsQuery = useCalendarEventsInRange(
    start.toISOString(),
    end.toISOString(),
    !IS_PREVIEW && connected,
  );

  // Once connected, pull the latest events in the background so the week fills in.
  useEffect(() => {
    if (!IS_PREVIEW && connected && !bgSync.isPending && !bgSync.isSuccess) {
      bgSync.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const events: CalendarEvent[] = IS_PREVIEW
    ? demoWeekEvents(start)
    : eventsQuery.data ?? [];

  const daysWithEvents = new Set(
    events.map((e) => (e.start_at ? new Date(e.start_at).toDateString() : "")).filter(Boolean),
  );

  const showConnect = !IS_PREVIEW && !connected && !connectionQuery.isLoading;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1" aria-hidden="true">
        {days.map((d, i) => (
          <div
            key={i}
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-md py-1.5 text-xs",
              d.isToday ? "bg-primary/10 text-primary" : "text-muted-foreground",
            )}
          >
            <span className="text-[10px] uppercase tracking-wide">{d.label}</span>
            <span className="font-medium tabular-nums">{d.date}</span>
            {daysWithEvents.has(d.iso) && (
              <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
            )}
          </div>
        ))}
      </div>

      {showConnect ? (
        <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span>Connect Outlook to see your week</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Your meetings and events will appear here once your calendar is linked.
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
        <p className="px-1 text-xs text-muted-foreground">Loading your week…</p>
      ) : events.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">No events this week.</p>
      ) : (
        <ul className="space-y-1.5">
          {events.slice(0, 5).map((ev) => (
            <li
              key={ev.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-1.5"
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-foreground">
                  {ev.subject ?? "(untitled)"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {ev.start_at ? format(new Date(ev.start_at), "EEE h:mm a") : "No date"}
                </div>
              </div>
              {ev.join_web_url && (
                <Button asChild variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                  <a href={ev.join_web_url} target="_blank" rel="noopener noreferrer" aria-label="Open meeting">
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
