import { useMemo, useState } from "react";
import { addDays, endOfMonth, startOfMonth } from "date-fns";
import { TimelineToolbar } from "@/components/timeline/TimelineToolbar";
import { CalendarView } from "@/components/timeline/CalendarView";
import { GanttView } from "@/components/timeline/GanttView";
import { EntityDetailSheet } from "@/components/timeline/EntityDetailSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
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
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <PageHeader
        title="Timeline"
        subtitle="Tasks, projects, and requests on one canvas"
      />

      <TimelineToolbar
        view={view}
        onViewChange={setView}
        filters={filters}
        onFiltersChange={setFilters}
        colorBy={colorBy}
        onColorByChange={setColorBy}
        range={range}
        onRangeChange={setRange}
        count={isLoading ? undefined : events.length}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-10 w-48" />
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
            <Skeleton className="h-[60vh] w-full" />
          </div>
        ) : view === "month" ? (
          <CalendarView
            events={events}
            colorBy={colorBy}
            onEventClick={handleEventClick}
            /* Open on the CURRENT month — range.from is padded a week back and
               lands in the previous month for the first 7 days of any month. */
            initialMonth={today}
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
