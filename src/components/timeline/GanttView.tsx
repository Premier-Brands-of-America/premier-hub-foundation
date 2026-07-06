import { useMemo, useRef, useState } from "react";
import { addDays, differenceInCalendarDays, format, isSameDay } from "date-fns";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityAvatar } from "@/components/common/EntityAvatar";
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
/** Fixed left label column (mono code + title + assignee) so bars aren't floating. */
const LABEL_W = 260;
/** Shared header height so the label column and day header stay row-aligned. */
const HEADER_H = 44;

/** Short mono tag from the real entity type (no fabricated ticket numbers). */
const TYPE_CODE: Record<TimelineEntityType, string> = {
  task: "TASK",
  project: "PROJ",
  request: "REQ",
};

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
  const [dragPos, setDragPos] = useState<number | null>(null);

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
    if (!dragState) return;
    setDragPos(e.clientX);
  };

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
  const laneWidth = totalDays * DAY_PX;

  return (
    <div className="flex h-full overflow-auto">
      {/* Fixed left label column — sticky so it stays put while the lane scrolls */}
      <div
        className="sticky left-0 z-20 flex-none border-r border-border bg-card"
        style={{ width: LABEL_W }}
      >
        {/* header spacer aligns with the day-row header on the right */}
        <div
          className="sticky top-0 z-10 flex items-center border-b border-border bg-card px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground"
          style={{ height: HEADER_H }}
        >
          {visibleItems.length} {visibleItems.length === 1 ? "item" : "items"}
        </div>
        {visibleItems.map((event) => (
          <div
            key={`${event.entity_type}-${event.id}`}
            className="flex items-center gap-2 border-b border-border px-3"
            style={{ height: rowHeight }}
          >
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
              {TYPE_CODE[event.entity_type]}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{event.title}</span>
            {event.owner_id && (
              <EntityAvatar type="user" seed={event.owner_id} size="xs" className="shrink-0" />
            )}
          </div>
        ))}
        {visibleItems.length === 0 && <div style={{ height: 200 }} />}
      </div>

      {/* Scrollable lane area */}
      <div className="flex-1" style={{ minWidth: laneWidth }}>
        {/* day header */}
        <div className="sticky top-0 z-10 flex border-b border-border bg-card">
          {days.map((d, i) => {
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const isToday = isSameDay(d, today);
            return (
              <div
                key={i}
                className={cn(
                  "flex flex-col items-center justify-center border-r border-border text-center text-xs",
                  isWeekend && "bg-muted/40",
                )}
                style={{ width: DAY_PX, height: HEADER_H }}
              >
                <div className={cn(
                  "text-[10px] uppercase tracking-wide",
                  isToday ? "font-semibold text-primary" : "text-muted-foreground",
                )}>
                  {format(d, "EEE")}
                </div>
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
          {/* day grid lines + weekend shading + crimson today line */}
          <div className="pointer-events-none absolute inset-0 flex">
            {days.map((d, i) => {
              const isToday = isSameDay(d, today);
              return (
                <div
                  key={i}
                  className={cn(
                    "relative h-full border-r border-border/60",
                    (d.getDay() === 0 || d.getDay() === 6) && "bg-muted/20",
                  )}
                  style={{ width: DAY_PX }}
                >
                  {isToday && (
                    <div
                      className="absolute inset-y-0 left-0 w-0.5 bg-primary before:absolute before:-left-[3px] before:-top-1 before:h-2 before:w-2 before:rounded-full before:bg-primary before:content-['']"
                      aria-hidden
                    />
                  )}
                </div>
              );
            })}
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
