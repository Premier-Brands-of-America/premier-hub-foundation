import { useMemo, useState } from "react";
import {
  addDays, differenceInCalendarDays, endOfWeek, format, isSameDay, startOfWeek,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { dueLabel, dueUrgency } from "@/lib/dueDate";
import { EventListPopover } from "./EventListPopover";
import { getEventColorVar } from "./eventColors";
import type { ColorBy, TimelineEvent } from "@/types/timeline";

interface Props {
  events: TimelineEvent[];
  colorBy: ColorBy;
  onEventClick: (e: TimelineEvent) => void;
  /** Any date inside the week to open on. Defaults to today. */
  initialDate?: Date;
}

/** Timeline dates are date-only (YYYY-MM-DD); parse as LOCAL midnight so day
 *  math never drifts across a timezone boundary (matches CalendarView). */
function parseDate(iso: string | null): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dayKey(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** How many all-day pills a single day cell shows before collapsing to +N. */
const MAX_PER_DAY = 3;

export function WeekView({ events, colorBy, onEventClick, initialDate }: Props) {
  // weekStartsOn: 1 → Monday-first week, matching the Mon–Sun mockup.
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(initialDate ?? new Date(), { weekStartsOn: 1 }),
  );

  const today = new Date();
  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // Split events into multi-day spans (one bar each) vs single-day items (pills).
  const { spans, byDay } = useMemo(() => {
    // gridStart/gridEnd are 1-based grid lines within the 7-column day grid
    // (Mon = line 1..2, Sun = line 7..8), so a bar spans [gridStart, gridEnd).
    const spans: Array<{ event: TimelineEvent; gridStart: number; gridEnd: number }> = [];
    const byDay = new Map<number, TimelineEvent[]>();
    for (const d of days) byDay.set(dayKey(d), []);

    const wkStartKey = dayKey(weekStart);
    const wkEndKey = dayKey(weekEnd);

    for (const e of events) {
      const s = parseDate(e.start_date);
      if (!s) continue;
      const en = parseDate(e.end_date) ?? s;
      const sKey = dayKey(s);
      const enKey = dayKey(en);
      // Skip events entirely outside the visible week.
      if (enKey < wkStartKey || sKey > wkEndKey) continue;

      const multiDay = enKey > sKey;
      if (multiDay) {
        // Clamp the span to the visible week (weekday index 0=Mon .. 6=Sun).
        const startIdx = Math.max(0, differenceInCalendarDays(s, weekStart));
        const endIdx = Math.min(6, differenceInCalendarDays(en, weekStart));
        spans.push({ event: e, gridStart: startIdx + 1, gridEnd: endIdx + 2 });
      } else {
        byDay.get(sKey)?.push(e);
      }
    }
    return { spans, byDay };
  }, [events, days, weekStart, weekEnd]);

  const rangeLabel =
    format(weekStart, "MMM d") +
    " – " +
    (weekStart.getMonth() === weekEnd.getMonth()
      ? format(weekEnd, "d, yyyy")
      : format(weekEnd, "MMM d, yyyy"));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="font-display text-xl tabular-nums">{rangeLabel}</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            Today
          </Button>
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {/* Day headers: 64px gutter + 5 weekday cols + 2 narrower weekend cols */}
          <div
            className="grid border-b border-border"
            style={{ gridTemplateColumns: "64px repeat(5,minmax(0,1fr)) repeat(2,minmax(0,0.6fr))" }}
          >
            <div aria-hidden />
            {days.map((d) => {
              const isToday = isSameDay(d, today);
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={dayKey(d)}
                  className={cn(
                    "relative flex items-center gap-2 border-l border-border px-2.5 py-2.5",
                    isToday && "before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-primary before:content-['']",
                  )}
                >
                  <span
                    className={cn(
                      "text-[11px] font-medium uppercase tracking-[0.08em]",
                      isToday ? "font-semibold text-primary" : "text-muted-foreground",
                      isWeekend && !isToday && "text-muted-foreground/60",
                    )}
                  >
                    {format(d, "EEE")}
                  </span>
                  <span
                    className={cn(
                      "text-[15px] font-semibold tabular-nums",
                      isToday && "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[13px] text-primary-foreground",
                      isWeekend && !isToday && "text-muted-foreground/60",
                    )}
                  >
                    {format(d, "d")}
                  </span>
                </div>
              );
            })}
          </div>

          {/* All-day lane: spanning bars (top) + per-day due pills below them */}
          <div
            className="relative grid border-b border-border"
            style={{ gridTemplateColumns: "64px repeat(5,minmax(0,1fr)) repeat(2,minmax(0,0.6fr))" }}
          >
            <div className="px-2 pt-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                All-day
              </span>
            </div>

            {/* One row of spanning bars drawn once across the columns they touch.
               Overlaid on the day cells; wrapper ignores pointer events so pills
               in uncovered cells stay clickable, buttons re-enable them. */}
            {spans.length > 0 && (
              <div
                className="pointer-events-none col-start-2 col-end-9 flex flex-col gap-1 px-1 pt-2"
                style={{ gridRow: 1 }}
              >
                {/* Same 5×1fr + 2×0.6fr template as the day columns so span bars
                   line up with the cells beneath (weekends are narrower). */}
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: "repeat(5,minmax(0,1fr)) repeat(2,minmax(0,0.6fr))" }}
                >
                  {spans.map(({ event, gridStart, gridEnd }) => (
                    <button
                      key={`${event.entity_type}-${event.id}`}
                      type="button"
                      onClick={() => onEventClick(event)}
                      aria-label={`${event.entity_type}: ${event.title}, ${format(parseDate(event.start_date)!, "MMM d")} to ${format(parseDate(event.end_date ?? event.start_date)!, "MMM d")}`}
                      title={event.title}
                      className="pointer-events-auto flex h-6 items-center gap-2 truncate rounded-md border px-2.5 text-left text-[11.5px] font-semibold text-foreground transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{
                        gridColumn: `${gridStart} / ${gridEnd}`,
                        backgroundColor: `hsl(var(${getEventColorVar(event, colorBy)}) / 0.16)`,
                        borderColor: `hsl(var(${getEventColorVar(event, colorBy)}) / 0.42)`,
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: `hsl(var(${getEventColorVar(event, colorBy)}))` }}
                        aria-hidden
                      />
                      <span className="truncate">{event.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Per-day single-day pills, offset below the spans lane */}
            {days.map((d, i) => {
              const dayEvents = byDay.get(dayKey(d)) ?? [];
              const visible = dayEvents.slice(0, MAX_PER_DAY);
              const overflow = dayEvents.length - visible.length;
              const isToday = isSameDay(d, today);
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={dayKey(d)}
                  className={cn(
                    "flex min-h-[64px] flex-col gap-1 border-l border-border px-1 pb-1.5",
                    spans.length > 0 ? "pt-9" : "pt-2",
                    isToday && "bg-primary/[0.03]",
                    isWeekend && "bg-muted/30",
                  )}
                  style={{ gridColumnStart: i + 2, gridRow: 1 }}
                >
                  {visible.map((e) => {
                    const urgency = dueUrgency(e.end_date ?? e.start_date, today);
                    const overdue = urgency === "overdue";
                    return (
                      <button
                        key={`${e.entity_type}-${e.id}`}
                        type="button"
                        onClick={() => onEventClick(e)}
                        aria-label={`${e.entity_type}: ${e.title}`}
                        title={e.title}
                        className={cn(
                          "flex h-[22px] items-center gap-1.5 rounded-md border px-2 text-left text-[11.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          !overdue && "border-border bg-muted/60 text-foreground hover:border-muted-foreground/40",
                        )}
                        // Overdue tint uses inline style to keep the alpha token
                        // unambiguous (matches ProofChip / WorkItemRow convention).
                        style={overdue ? {
                          backgroundColor: "hsl(var(--status-danger) / 0.12)",
                          borderColor: "hsl(var(--status-danger) / 0.5)",
                          color: "hsl(var(--status-danger))",
                        } : undefined}
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: overdue
                              ? "hsl(var(--status-danger))"
                              : `hsl(var(${getEventColorVar(e, colorBy)}))`,
                          }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate">{e.title}</span>
                        {overdue && (
                          <span className="shrink-0 font-mono text-[10px] font-semibold">
                            {dueLabel(e.end_date ?? e.start_date, today)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {overflow > 0 && (
                    <EventListPopover
                      events={dayEvents}
                      colorBy={colorBy}
                      onEventClick={onEventClick}
                      trigger={
                        <button
                          type="button"
                          className="flex h-[22px] items-center justify-center rounded-md border border-dashed border-border text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          +{overflow} more
                        </button>
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Time grid backdrop with a crimson now-line on today.
             TimelineEvent carries no time-of-day, so we do NOT fabricate timed
             blocks — the grid is a visual anchor; work lives in the all-day lane. */}
          <TimeGrid days={days} today={today} />
        </div>
      </div>
    </div>
  );
}

/** 8 AM–6 PM hour rows with a live now-line marker on today's column. */
function TimeGrid({ days, today }: { days: Date[]; today: Date }) {
  const HOUR_PX = 48;
  const START_HOUR = 8;
  const HOURS = 10; // 8 AM through 6 PM
  const hours = Array.from({ length: HOURS }, (_, i) => START_HOUR + i);

  const now = new Date();
  const nowInRange = now.getHours() >= START_HOUR && now.getHours() < START_HOUR + HOURS;
  const nowTop = ((now.getHours() - START_HOUR) + now.getMinutes() / 60) * HOUR_PX;

  const fmtHour = (h: number) => {
    const period = h < 12 ? "AM" : "PM";
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display} ${period}`;
  };

  return (
    <div
      className="relative grid"
      style={{ gridTemplateColumns: "64px repeat(5,minmax(0,1fr)) repeat(2,minmax(0,0.6fr))" }}
    >
      {/* hour gutter */}
      <div className="relative" style={{ height: HOUR_PX * HOURS }}>
        {hours.map((h, i) => (
          <span
            key={h}
            className="absolute right-2 -translate-y-1/2 text-[10.5px] text-muted-foreground"
            style={{ top: i * HOUR_PX }}
          >
            {fmtHour(h)}
          </span>
        ))}
      </div>

      {days.map((d) => {
        const isToday = isSameDay(d, today);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        return (
          <div
            key={dayKey(d)}
            className={cn(
              "relative border-l border-border",
              isWeekend && "bg-muted/30",
              isToday && "bg-primary/[0.03]",
            )}
            style={{
              height: HOUR_PX * HOURS,
              backgroundImage:
                "repeating-linear-gradient(to bottom, hsl(var(--border)/0.5) 0 1px, transparent 1px " +
                HOUR_PX +
                "px)",
            }}
          >
            {isToday && nowInRange && (
              <div
                className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-primary before:absolute before:-left-1 before:-top-[3px] before:h-2 before:w-2 before:rounded-full before:bg-primary before:content-['']"
                style={{ top: nowTop }}
                aria-hidden
              />
            )}
            {isToday && nowInRange && (
              <span
                className="pointer-events-none absolute left-1 z-20 -translate-y-1/2 rounded border bg-background px-1 py-px font-mono text-[10px] font-semibold text-primary"
                style={{ top: nowTop, borderColor: "hsl(var(--primary) / 0.45)" }}
              >
                {format(now, "H:mm")}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
