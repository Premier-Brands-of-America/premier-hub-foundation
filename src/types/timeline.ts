export type TimelineEntityType = "task" | "project" | "request";

export interface TimelineEvent {
  entity_type: TimelineEntityType;
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  color_hint: string | null;
  owner_id: string | null;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export type ColorBy = "status" | "priority" | "type";
// Week is the default surface; "gantt" is the compact strip (was "timeline").
export type TimelineView = "month" | "week" | "gantt";

export interface TimelineFilters {
  types: TimelineEntityType[];
}