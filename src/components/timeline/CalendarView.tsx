import { useMemo, useState } from "react";
import {
  addDays, endOfMonth, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, endOfWeek,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EventListPopover } from "./EventListPopover";
import { getEventColorVar } from "./eventColors";
import type { ColorBy, TimelineEvent } from "@/types/timeline";

interface Props {
  events: TimelineEvent[];
  colorBy: ColorBy;
  onEventClick: (e: TimelineEvent) => void;
  initialMonth?: Date;
}

function parseDate(iso: string | null): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function eventsForDay(events: TimelineEvent[], day: Date): TimelineEvent[] {
  return events.filter((e) => {
    const s = parseDate(e.start_date);
    const en = parseDate(e.end_date) ?? s;
    if (!s || !en) return false;
    return day >= new Date(s.getFullYear(), s.getMonth(), s.getDate()) &&
           day <= new Date(en.getFullYear(), en.getMonth(), en.getDate());
  });
}

export function CalendarView({ events, colorBy, onEventClick, initialMonth }: Props) {
  const [month, setMonth] = useState<Date>(initialMonth ?? new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    const arr: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) arr.push(d);
    return arr;
  }, [month]);

  const today = new Date();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="font-display text-xl">{format(month, "MMMM yyyy")}</h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonth(addDays(startOfMonth(month), -1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMonth(new Date())}>Today</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonth(addDays(endOfMonth(month), 1))} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-y border-border bg-muted/40 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} className="p-2 text-center">{d}</div>
        ))}
      </div>

      <div className="grid flex-1 auto-rows-fr grid-cols-7">
        {days.map((day) => {
          const dayEvents = eventsForDay(events, day);
          const visible = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visible.length;
          const inMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex min-h-[100px] flex-col gap-1 border-b border-r border-border p-1.5 transition-colors",
                inMonth ? "bg-card hover:bg-accent/40" : "bg-muted/30 text-muted-foreground",
              )}
            >
              <div className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                isToday && "bg-primary text-primary-foreground",
              )}>
                {format(day, "d")}
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {visible.map((e) => {
                  const token = getEventColorVar(e, colorBy);
                  return (
                    <button
                      key={`${e.entity_type}-${e.id}`}
                      type="button"
                      onClick={() => onEventClick(e)}
                      aria-label={`${e.entity_type}: ${e.title}`}
                      title={e.title}
                      className="flex items-center gap-1.5 truncate rounded border px-1.5 py-0.5 text-left text-[10px] font-medium transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{
                        backgroundColor: `hsl(var(${token}) / 0.16)`,
                        borderColor: `hsl(var(${token}) / 0.4)`,
                        color: `hsl(var(${token}))`,
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: `hsl(var(${token}))` }}
                        aria-hidden
                      />
                      <span className="truncate">{e.title}</span>
                    </button>
                  );
                })}
                {overflow > 0 && (
                  <EventListPopover
                    events={dayEvents}
                    colorBy={colorBy}
                    onEventClick={onEventClick}
                    trigger={
                      <button type="button" className="text-[10px] text-muted-foreground hover:text-foreground text-left px-1.5">
                        +{overflow} more
                      </button>
                    }
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}