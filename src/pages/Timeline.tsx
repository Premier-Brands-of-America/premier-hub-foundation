import { useMemo, useState } from "react";
import { addDays, endOfMonth, startOfMonth } from "date-fns";
import { TimelineToolbar } from "@/components/timeline/TimelineToolbar";
import { CalendarView } from "@/components/timeline/CalendarView";
import { GanttView } from "@/components/timeline/GanttView";
import { EntityDetailSheet } from "@/components/timeline/EntityDetailSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useTimeline } from "@/hooks/use-timeline";
import { useRescheduleEvent } from "@/hooks/use-reschedule-event";
import { useRealtimeInvalidation } from "@/hooks/use-realtime";
import { useAuth } from "@/contexts/AuthContext";
import type {
  ColorBy, DateRange, TimelineEntityType, TimelineEvent, TimelineFilters, TimelineView,
} from "@/types/timeline";

export default function TimelinePage() {
  const { user } = useAuth();
  const today = new Date();
  const [view, setView] = useState<TimelineView>("month");
  const [filters, setFilters] = useState<TimelineFilters>({
    types: ["task", "project", "request"],
  });
  const [colorBy, setColorBy] = useState<ColorBy>("status");
  const [range, setRange] = useState<DateRange>({
    from: addDays(startOfMonth(today), -7),
    to: addDays(endOfMonth(today), 7),
  });
  const [selected, setSelected] = useState<{ type: TimelineEntityType; id: string } | null>(null);

  const typesParam: TimelineEntityType[] | undefined =
    filters.types.length === 3 ? undefined : filters.types;

  const { data, isLoading } = useTimeline(range.from, range.to, typesParam);
  const reschedule = useRescheduleEvent();

  // Realtime: invalidate timeline when sources change
  useRealtimeInvalidation("tasks", ["timeline"]);
  useRealtimeInvalidation("projects", ["timeline"]);

  const events = useMemo(() => data ?? [], [data]);

  const handleEventClick = (e: TimelineEvent) => {
    setSelected({ type: e.entity_type, id: e.id });
  };

  const canEdit = (e: TimelineEvent) => {
    if (e.id.startsWith("mock-")) return true;
    if (e.entity_type === "task") return e.owner_id === user?.id;
    return true; // RLS will enforce; allow attempt
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <header className="px-4 pt-4">
        <h1 className="text-2xl font-bold">Timeline</h1>
        <p className="text-sm text-muted-foreground">Tasks, projects, and requests on one canvas.</p>
      </header>
      <TimelineToolbar
        view={view}
        onViewChange={setView}
        filters={filters}
        onFiltersChange={setFilters}
        colorBy={colorBy}
        onColorByChange={setColorBy}
        range={range}
        onRangeChange={setRange}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : view === "month" ? (
          <CalendarView
            events={events}
            colorBy={colorBy}
            onEventClick={handleEventClick}
            initialMonth={range.from}
          />
        ) : (
          <GanttView
            items={events}
            range={range}
            colorBy={colorBy}
            onEventClick={handleEventClick}
            canEdit={canEdit}
            onReschedule={(id, type, start, end) =>
              reschedule.mutate({ id, entity_type: type, start_date: start, end_date: end })
            }
          />
        )}
      </div>
      <EntityDetailSheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        entity={selected}
      />
    </div>
  );
}