import { CalendarDays, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Calendar (this week) card.
 *
 * Consumes the Outlook integration's `calendar_events` table — built in
 * PARALLEL by INTEG-OUTLOOK. Per the DASHBOARD spec we do NOT build calendar
 * fetching here: render a graceful "Connect Outlook" empty state with a week
 * scaffold. Once INTEG-OUTLOOK lands `calendar_events` + the OAuth connect
 * flow, this card swaps the empty state for a real week view (see P4 notes).
 */

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function weekDates(): { label: string; date: number; isToday: boolean }[] {
  const now = new Date();
  const day = now.getDay(); // 0=Sun..6=Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  return DAY_LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label,
      date: d.getDate(),
      isToday: d.toDateString() === now.toDateString(),
    };
  });
}

export function CalendarWeekCard() {
  const days = weekDates();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1" aria-hidden="true">
        {days.map((d, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md py-1.5 text-xs",
              d.isToday ? "bg-primary/10 text-primary" : "text-muted-foreground",
            )}
          >
            <span className="text-[10px] uppercase tracking-wide">{d.label}</span>
            <span className="font-medium tabular-nums">{d.date}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span>Connect Outlook to see your week</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Your meetings and events will appear here once your calendar is linked.
        </p>
        <Button variant="tinted" size="sm" className="gap-1.5" disabled>
          <Plug className="h-3.5 w-3.5" />
          Connect Outlook
        </Button>
      </div>
    </div>
  );
}
