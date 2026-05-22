import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
}

const TYPE_LABELS: Record<TimelineEntityType, string> = {
  task: "Tasks",
  project: "Projects",
  request: "Requests",
};
const ALL_TYPES: TimelineEntityType[] = ["task", "project", "request"];

export function TimelineToolbar({
  view, onViewChange, filters, onFiltersChange, colorBy, onColorByChange, range, onRangeChange,
}: Props) {
  const toggleType = (t: TimelineEntityType) => {
    const has = filters.types.includes(t);
    onFiltersChange({
      types: has ? filters.types.filter((x) => x !== t) : [...filters.types, t],
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 border-b bg-card">
      <ToggleGroup
        type="single"
        value={view}
        onValueChange={(v) => v && onViewChange(v as TimelineView)}
        size="sm"
      >
        <ToggleGroupItem value="month" aria-label="Month view">Month</ToggleGroupItem>
        <ToggleGroupItem value="timeline" aria-label="Timeline view">Timeline</ToggleGroupItem>
      </ToggleGroup>

      <div className="flex items-center gap-1.5" role="group" aria-label="Entity filters">
        {ALL_TYPES.map((t) => {
          const active = filters.types.includes(t);
          return (
            <Badge
              key={t}
              variant={active ? "default" : "secondary"}
              className="cursor-pointer select-none"
              onClick={() => toggleType(t)}
              aria-pressed={active}
              role="button"
            >
              {TYPE_LABELS[t]}
            </Badge>
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
            <CalendarIcon className="h-4 w-4" />
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
    </div>
  );
}