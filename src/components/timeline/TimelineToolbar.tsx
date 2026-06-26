import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type {
  ColorBy,
  DateRange,
  TimelineEntityType,
  TimelineFilters,
  TimelineView,
} from "@/types/timeline";

interface Props {
  view: TimelineView;
  onViewChange: (v: TimelineView) => void;
  filters: TimelineFilters;
  onFiltersChange: (f: TimelineFilters) => void;
  colorBy: ColorBy;
  onColorByChange: (c: ColorBy) => void;
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
  count?: number;
}

const TYPE_LABELS: Record<TimelineEntityType, string> = {
  task: "Tasks",
  project: "Projects",
  request: "Requests",
};
const ALL_TYPES: TimelineEntityType[] = ["task", "project", "request"];

export function TimelineToolbar({
  view, onViewChange, filters, onFiltersChange, colorBy, onColorByChange, range, onRangeChange, count,
}: Props) {
  const toggleType = (t: TimelineEntityType) => {
    const has = filters.types.includes(t);
    onFiltersChange({
      types: has ? filters.types.filter((x) => x !== t) : [...filters.types, t],
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border bg-card px-4 py-3">
      <ToggleGroup
        type="single"
        value={view}
        onValueChange={(v) => v && onViewChange(v as TimelineView)}
        size="sm"
      >
        <ToggleGroupItem value="month" aria-label="Month view">Month</ToggleGroupItem>
        <ToggleGroupItem value="timeline" aria-label="Timeline view">Timeline</ToggleGroupItem>
      </ToggleGroup>

      <div className="h-5 w-px bg-border" aria-hidden="true" />

      <div className="flex items-center gap-1.5" role="group" aria-label="Entity filters">
        {ALL_TYPES.map((t) => {
          const active = filters.types.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggleType(t)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-transparent"
                  : "border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              style={active ? {
                backgroundColor: `hsl(var(--entity-${t}) / 0.14)`,
                color: `hsl(var(--entity-${t}))`,
              } : undefined}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: `hsl(var(--entity-${t}))`, opacity: active ? 1 : 0.4 }}
                aria-hidden="true"
              />
              {TYPE_LABELS[t]}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Color by</span>
        <Select value={colorBy} onValueChange={(v) => onColorByChange(v as ColorBy)}>
          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="type">Type</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            {format(range.from, "MMM d")} – {format(range.to, "MMM d, yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: range.from, to: range.to }}
            onSelect={(r) => {
              if (r?.from && r?.to) onRangeChange({ from: r.from, to: r.to });
            }}
            numberOfMonths={2}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {typeof count === "number" && (
        <div className="ml-auto flex items-baseline gap-1.5 text-xs text-muted-foreground">
          <span className="stat-numeral text-base text-foreground">{count}</span>
          {count === 1 ? "item" : "items"}
        </div>
      )}
    </div>
  );
}
