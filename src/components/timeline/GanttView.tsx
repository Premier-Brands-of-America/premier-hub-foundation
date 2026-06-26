import { useMemo, useRef, useState } from "react";
import { addDays, differenceInCalendarDays, format, isSameDay } from "date-fns";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { EventBar } from "./EventBar";
import type { ColorBy, DateRange, TimelineEntityType, TimelineEvent } from "@/types/timeline";

interface Props {
  items: TimelineEvent[];
  range: DateRange;
  colorBy: ColorBy;
  onReschedule: (id: string, type: TimelineEntityType, start: string, end: string) => void;
  onEventClick: (e: TimelineEvent) => void;
  canEdit?: (e: TimelineEvent) => boolean;
  rowHeight?: number;
}

const DAY_PX = 40;

function parseDate(iso: string | null): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function GanttView({
  items, range, colorBy, onReschedule, onEventClick, canEdit, rowHeight = 36,
}: Props) {
  const totalDays = Math.max(1, differenceInCalendarDays(range.to, range.from) + 1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{ id: string; offsetDays: number } | null>(null);

  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < totalDays; i++) arr.push(addDays(range.from, i));
    return arr;
  }, [range.from, totalDays]);

  const visibleItems = items.filter((e) => e.start_date && e.end_date);

  const handlePointerDown = (e: React.PointerEvent, event: TimelineEvent) => {
    if (canEdit && !canEdit(event)) return;
    e.preventDefault();
    const s = parseDate(event.start_date);
    if (!s) return;
    const startOffset = differenceInCalendarDays(s, range.from);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pointerDay = Math.floor((e.clientX - rect.left) / DAY_PX);
    setDragState({ id: `${event.entity_type}-${event.id}`, offsetDays: pointerDay - startOffset });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // no-op visual update via re-render below
    if (!dragState) return;
    setDragPos(e.clientX);
  };

  const [dragPos, setDragPos] = useState<number | null>(null);

  const handlePointerUp = (e: React.PointerEvent, event: TimelineEvent) => {
    if (!dragState || dragState.id !== `${event.entity_type}-${event.id}`) {
      setDragState(null); setDragPos(null);
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    setDragState(null); setDragPos(null);
    if (!rect) return;
    const pointerDay = Math.floor((e.clientX - rect.left) / DAY_PX);
    const newStartOffset = pointerDay - dragState.offsetDays;
    const s = parseDate(event.start_date)!;
    const en = parseDate(event.end_date)!;
    const len = differenceInCalendarDays(en, s);
    const newStart = addDays(range.from, Math.max(0, Math.min(totalDays - 1, newStartOffset)));
    const newEnd = addDays(newStart, len);
    const oldStartOffset = differenceInCalendarDays(s, range.from);
    if (newStartOffset === oldStartOffset) return;
    onReschedule(event.id, event.entity_type, toIso(newStart), toIso(newEnd));
  };

  const today = new Date();

  return (
    <div className="h-full overflow-auto">
      <div style={{ minWidth: totalDays * DAY_PX }}>
        {/* header */}
        <div className="sticky top-0 z-10 flex border-b border-border bg-card">
          {days.map((d, i) => {
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const isToday = isSameDay(d, today);
            return (
              <div
                key={i}
                className={cn(
                  "border-r border-border py-1.5 text-center text-xs",
                  isWeekend && "bg-muted/40",
                )}
                style={{ width: DAY_PX }}
              >
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{format(d, "EEE")}</div>
                <div
                  className={cn(
                    "mx-auto flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                    isToday && "bg-primary text-primary-foreground",
                  )}
                >
                  {format(d, "d")}
                </div>
              </div>
            );
          })}
        </div>

        {/* rows */}
        <div
          ref={containerRef}
          className="relative"
          style={{ height: Math.max(visibleItems.length * rowHeight, 200) }}
          onPointerMove={handlePointerMove}
        >
          {/* day grid lines */}
          <div className="pointer-events-none absolute inset-0 flex">
            {days.map((d, i) => (
              <div
                key={i}
                className={cn(
                  "h-full border-r border-border/60",
                  (d.getDay() === 0 || d.getDay() === 6) && "bg-muted/20",
                )}
                style={{ width: DAY_PX }}
              />
            ))}
          </div>

          {visibleItems.map((event, idx) => {
            const s = parseDate(event.start_date)!;
            const en = parseDate(event.end_date)!;
            const startOffset = differenceInCalendarDays(s, range.from);
            const span = Math.max(1, differenceInCalendarDays(en, s) + 1);
            const editable = !canEdit || canEdit(event);
            const isDragging = dragState?.id === `${event.entity_type}-${event.id}`;

            let left = startOffset * DAY_PX;
            if (isDragging && dragPos !== null && containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              const pointerDay = Math.floor((dragPos - rect.left) / DAY_PX);
              const newStartOffset = pointerDay - (dragState?.offsetDays ?? 0);
              left = Math.max(0, Math.min(totalDays - span, newStartOffset)) * DAY_PX;
            }

            return (
              <div
                key={`${event.entity_type}-${event.id}`}
                className="absolute"
                style={{
                  top: idx * rowHeight + 4,
                  left,
                  width: span * DAY_PX - 4,
                  height: rowHeight - 8,
                }}
                onPointerUp={(e) => handlePointerUp(e, event)}
              >
                <EventBar
                  event={event}
                  colorBy={colorBy}
                  draggable={editable}
                  onPointerDown={editable ? (e) => handlePointerDown(e, event) : undefined}
                  onClick={() => !isDragging && onEventClick(event)}
                  className={cn("w-full h-full", isDragging && "ring-2 ring-primary opacity-80")}
                />
              </div>
            );
          })}

          {visibleItems.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <EmptyState
                icon={<CalendarRange className="h-6 w-6" />}
                title="Nothing scheduled here"
                description="No tasks, projects, or requests fall in this date range. Widen the range or adjust your filters."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}