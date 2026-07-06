/**
 * DayRail — the right-hand "Your day" column on Home.
 *
 * Fuses today's calendar events (the same Outlook data + demo agenda the
 * CalendarTodayCard reads) with the day's DUE work items onto a single
 * chronological spine. A live crimson "now" line splits past from upcoming;
 * past slots dim, an overdue item pins to the top, and tomorrow's first due
 * item peeks at the bottom.
 *
 * Presentation only — all data comes from `useMyDay()` (work) and the Outlook
 * hooks (calendar); nothing new is fetched here.
 */
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarDays, Video } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { isPreviewEnvironment } from "@/lib/environment";
import { dueLabel, daysUntil } from "@/lib/dueDate";
import { PROOF_META } from "@/components/pressroom";
import {
  useBackgroundCalendarSync,
  useCalendarEventsInRange,
  useOutlookConnection,
} from "@/components/integrations/outlook/hooks";
import type { CalendarEvent } from "@/components/integrations/outlook/outlook-api";
import { demoTodayEvents } from "./cards/CalendarTodayCard";
import type { DayItem } from "./useMyDay";

const IS_PREVIEW = isPreviewEnvironment();

/** Local 00:00 today → 00:00 tomorrow. */
function todayBounds(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
}

type Slot =
  | { kind: "meeting"; at: number; ev: CalendarEvent }
  | { kind: "due"; at: number; item: DayItem }
  | { kind: "now"; at: number };

/** Minutes-since-midnight for an ISO timestamp (local). */
function minutesOf(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/** Two-line time label ("2:30 / PM") for the spine gutter. */
function TimeLabel({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <>
      {format(d, "h:mm")}
      <br />
      {format(d, "a")}
    </>
  );
}

export function DayRail({
  dueItems,
  overdue,
}: {
  /** Open, dated work (from useMyDay). */
  dueItems: DayItem[];
  /** Overdue items to pin above the spine. */
  overdue: DayItem[];
}) {
  const { start, end } = todayBounds();

  const connectionQuery = useOutlookConnection();
  const bgSync = useBackgroundCalendarSync();
  const connected = !!connectionQuery.data;

  const eventsQuery = useCalendarEventsInRange(
    start.toISOString(),
    end.toISOString(),
    !IS_PREVIEW && connected,
  );

  // Once connected, pull the latest events in the background (mirrors the card).
  useEffect(() => {
    if (!IS_PREVIEW && connected && !bgSync.isPending && !bgSync.isSuccess) {
      bgSync.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const events: CalendarEvent[] = IS_PREVIEW
    ? demoTodayEvents(start)
    : eventsQuery.data ?? [];

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  // Items due *today* land on the spine at their timestamp; undated-time due
  // dates (date-only) sort to end-of-day so they read as "later today".
  const dueToday = useMemo(
    () => dueItems.filter((i) => i.dueDate != null && daysUntil(i.dueDate) === 0),
    [dueItems],
  );

  const tomorrow = useMemo(
    () =>
      dueItems
        .filter((i) => i.dueDate != null && daysUntil(i.dueDate) === 1)
        .slice(0, 3),
    [dueItems],
  );

  const slots: Slot[] = useMemo(() => {
    const s: Slot[] = [];
    for (const ev of events) {
      if (ev.start_at) s.push({ kind: "meeting", at: minutesOf(ev.start_at), ev });
    }
    for (const item of dueToday) {
      // Date-only due dates have no clock component → treat as end of day.
      const at = item.dueDate && item.dueDate.includes("T") ? minutesOf(item.dueDate) : 23 * 60 + 59;
      s.push({ kind: "due", at, item });
    }
    s.push({ kind: "now", at: nowMinutes });
    return s.sort((a, b) => a.at - b.at || (a.kind === "now" ? -1 : 1));
  }, [events, dueToday, nowMinutes]);

  const hasSchedule = slots.some((x) => x.kind !== "now");
  const meetingCount = events.filter((e) => e.start_at).length;
  const loadingCal = !IS_PREVIEW && (eventsQuery.isLoading || bgSync.isPending);

  // "Next up" summary — first upcoming slot after now.
  const nextUp = slots.find((x) => x.kind !== "now" && x.at >= nowMinutes) as
    | Exclude<Slot, { kind: "now" }>
    | undefined;
  const nextLabel =
    nextUp?.kind === "meeting"
      ? nextUp.ev.subject ?? "meeting"
      : nextUp?.kind === "due"
        ? nextUp.item.title
        : null;
  const nextTime =
    nextUp?.kind === "meeting" && nextUp.ev.start_at
      ? format(new Date(nextUp.ev.start_at), "h:mm a")
      : nextUp?.kind === "due" && nextUp.item.dueDate?.includes("T")
        ? format(new Date(nextUp.item.dueDate), "h:mm a")
        : null;

  return (
    <aside className="min-w-0" aria-label="Your day">
      <div className="sticky top-4 flex max-h-[calc(100vh-6rem)] flex-col overflow-y-auto rounded-lg border border-border bg-card">
        <div className="flex items-baseline gap-2 px-4 pb-1 pt-3.5">
          <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            Your day
          </span>
          <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
            {meetingCount} {meetingCount === 1 ? "meeting" : "meetings"} · {dueToday.length} due
          </span>
        </div>
        <div className="px-4 pb-2.5 text-xs tabular-nums text-muted-foreground">
          {format(start, "EEE, MMM d")}
          {nextLabel && (
            <> · next up: {nextLabel}{nextTime ? ` at ${nextTime}` : ""}</>
          )}
        </div>

        {/* Overdue pin — the one thing that must not slip. */}
        {overdue.slice(0, 1).map((item) => (
          <Link
            key={item.key}
            to={item.to}
            className="mx-3 mb-2.5 flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors"
            style={{
              backgroundColor: "hsl(var(--status-danger) / 0.12)",
              borderColor: "hsl(var(--status-danger) / 0.4)",
            }}
          >
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              style={{ color: "hsl(var(--status-danger))" }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "hsl(var(--status-danger))" }}
              >
                {item.dueDate ? dueLabel(item.dueDate) : "Overdue"}
              </div>
              <div className="truncate text-[13px] font-medium text-foreground">{item.title}</div>
              <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                {item.code && <span className="font-mono">{item.code}</span>}
                {item.assignee && <> · {item.assignee.name}</>}
              </div>
            </div>
          </Link>
        ))}

        {loadingCal ? (
          <p className="px-4 pb-4 text-xs text-muted-foreground">Loading your schedule…</p>
        ) : !hasSchedule ? (
          <p className="px-4 pb-4 text-xs text-muted-foreground">Nothing scheduled today.</p>
        ) : (
          <ol className="relative list-none px-3.5 pb-1.5 pt-0.5">
            {/* the vertical spine line */}
            <span
              className="pointer-events-none absolute bottom-2.5 top-2.5 w-px bg-border"
              style={{ left: "calc(0.875rem + 44px + 9px)" }}
              aria-hidden
            />
            {slots.map((slot, i) => {
              if (slot.kind === "now") {
                return (
                  <li
                    key="now"
                    className="relative grid grid-cols-[44px_1fr] items-center gap-x-5 py-1.5"
                    aria-label={`Now, ${format(new Date(), "h:mm a")}`}
                  >
                    <span
                      className="text-right font-mono text-[10px] font-semibold tracking-wide"
                      style={{ color: "hsl(var(--primary))" }}
                    >
                      NOW
                    </span>
                    <span className="relative">
                      <span
                        className="block h-0.5 rounded-full"
                        style={{ backgroundColor: "hsl(var(--primary))" }}
                      />
                      <span
                        className="absolute right-0 top-1.5 font-mono text-[10px] font-semibold tabular-nums"
                        style={{ color: "hsl(var(--primary))" }}
                      >
                        {format(new Date(), "h:mm a")}
                      </span>
                      <span
                        className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
                        style={{
                          // Sit the 8px node on the spine: column starts at 20px
                          // (gap) past the 53px spine, so pull left by 15px + half.
                          left: "-15px",
                          backgroundColor: "hsl(var(--primary))",
                          boxShadow: "0 0 0 3px hsl(var(--primary) / 0.22)",
                        }}
                        aria-hidden
                      />
                    </span>
                  </li>
                );
              }

              const past = slot.at < nowMinutes;

              if (slot.kind === "meeting") {
                const ev = slot.ev;
                const range =
                  ev.start_at && ev.end_at
                    ? `${format(new Date(ev.start_at), "h:mm")}–${format(new Date(ev.end_at), "h:mm a")}`
                    : ev.start_at
                      ? format(new Date(ev.start_at), "h:mm a")
                      : "";
                const card = (
                  <div className="rounded-lg border border-border bg-muted/40 p-2 transition-colors hover:border-border hover:bg-accent/50">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                        <Video className="h-3 w-3" aria-hidden />
                      </span>
                      <span className="truncate text-xs font-medium text-foreground">
                        {ev.subject ?? "(untitled)"}
                      </span>
                    </div>
                    {range && (
                      <div className="mt-1 text-[11px] tabular-nums text-muted-foreground">{range}</div>
                    )}
                  </div>
                );
                return (
                  <li
                    key={`m-${ev.id}-${i}`}
                    className={cn(
                      "relative grid grid-cols-[44px_1fr] gap-x-5 py-1.5 transition-opacity",
                      past && "opacity-50 hover:opacity-90",
                    )}
                  >
                    <span className="pt-1.5 text-right text-[11px] leading-tight tabular-nums text-muted-foreground">
                      {ev.start_at && <TimeLabel iso={ev.start_at} />}
                    </span>
                    <SpineDot token="--status-in-progress" />
                    {ev.join_web_url ? (
                      <a href={ev.join_web_url} target="_blank" rel="noopener noreferrer" className="block">
                        {card}
                      </a>
                    ) : (
                      card
                    )}
                  </li>
                );
              }

              // due-work slot
              const item = slot.item;
              const meta = PROOF_META[item.state];
              return (
                <li
                  key={item.key}
                  className={cn(
                    "relative grid grid-cols-[44px_1fr] gap-x-5 py-1.5 transition-opacity",
                    past && "opacity-50 hover:opacity-90",
                  )}
                >
                  <span className="pt-1.5 text-right text-[11px] leading-tight tabular-nums text-muted-foreground">
                    {item.dueDate?.includes("T") ? <TimeLabel iso={item.dueDate} /> : "due"}
                  </span>
                  <SpineDot token="--status-warning" />
                  <Link
                    to={item.to}
                    className="block rounded-lg border border-border bg-muted/40 p-2 transition-colors hover:border-border hover:bg-accent/50"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: `hsl(var(${meta.token}))` }}
                        title={meta.label}
                        aria-hidden
                      />
                      <span className="truncate text-xs font-medium text-foreground">{item.title}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
                      <span
                        className="rounded px-1.5 py-0.5 font-medium"
                        style={{
                          backgroundColor: "hsl(var(--status-warning) / 0.14)",
                          color: "hsl(var(--status-warning))",
                        }}
                      >
                        {item.dueDate ? dueLabel(item.dueDate) : "Due today"}
                      </span>
                      {item.code && <span className="font-mono">{item.code}</span>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}

        {hasSchedule && (
          <p className="px-4 pb-3 pt-1 text-center text-xs text-muted-foreground">
            That's everything for today.
          </p>
        )}

        {tomorrow.length > 0 && (
          <div className="border-t border-border px-4 pb-3.5 pt-2.5">
            <div className="pb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Tomorrow
            </div>
            {tomorrow.map((item) => {
              const meta = PROOF_META[item.state];
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className="-mx-1.5 flex items-center gap-2 rounded-md px-1.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: `hsl(var(${meta.token}))` }}
                    aria-hidden
                  />
                  <span className="truncate">{item.title} due</span>
                  {item.code && (
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                      {item.code}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

/** The colored node that sits on the spine line for a slot. */
function SpineDot({ token }: { token: string }) {
  return (
    <span
      className="absolute top-3.5 h-[7px] w-[7px] rounded-full border"
      style={{
        // Center the 7px node on the spine line (44px time col + 9px into gap).
        left: "calc(44px + 9px - 3.5px)",
        backgroundColor: `hsl(var(${token}) / 0.35)`,
        borderColor: `hsl(var(${token}) / 0.75)`,
      }}
      aria-hidden
    />
  );
}
