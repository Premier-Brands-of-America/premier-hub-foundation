import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import type { TimelineEntityType, TimelineEvent } from "@/types/timeline";

const IS_PREVIEW = isPreviewEnvironment();

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mockTimeline(from: Date, to: Date, types?: TimelineEntityType[]): TimelineEvent[] {
  const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
  const all: TimelineEvent[] = [];
  const allTypes: TimelineEntityType[] = ["task", "project", "request"];
  const statuses = ["todo", "in_progress", "blocked", "done", "active"];
  const priorities = ["low", "medium", "high", "urgent"];
  for (let i = 0; i < 8; i++) {
    const t = allTypes[i % 3];
    const startOffset = Math.floor((days / 8) * i);
    const startDate = new Date(from.getTime() + startOffset * 86400000);
    const span = t === "project" ? 5 + (i % 4) : t === "request" ? 2 + (i % 3) : 0;
    const endDate = new Date(startDate.getTime() + span * 86400000);
    all.push({
      entity_type: t,
      id: `mock-${t}-${i}`,
      title: `${t === "task" ? "Task" : t === "project" ? "Project" : "Request"} ${i + 1}`,
      start_date: toIsoDate(startDate),
      end_date: toIsoDate(endDate),
      status: statuses[i % statuses.length],
      color_hint: t === "request" ? priorities[i % priorities.length] : null,
      owner_id: null,
    });
  }
  return types?.length ? all.filter((e) => types.includes(e.entity_type)) : all;
}

export async function fetchTimeline(
  from: Date,
  to: Date,
  types?: TimelineEntityType[],
): Promise<TimelineEvent[]> {
  if (IS_PREVIEW) return mockTimeline(from, to, types);

  const { data, error } = await supabase.rpc("get_timeline" as never, {
    p_from: toIsoDate(from),
    p_to: toIsoDate(to),
    p_types: types && types.length ? types : undefined,
  } as never);
  if (error) throw error;
  return ((data ?? []) as unknown) as TimelineEvent[];
}

export interface ReschedulePayload {
  id: string;
  entity_type: TimelineEntityType;
  start_date: string;
  end_date: string;
}

export async function rescheduleEvent(p: ReschedulePayload): Promise<void> {
  if (IS_PREVIEW) return;

  if (p.entity_type === "task") {
    const { error } = await supabase
      .from("tasks")
      .update({ due_date: p.end_date })
      .eq("id", p.id);
    if (error) throw error;
  } else if (p.entity_type === "project") {
    const { error } = await supabase
      .from("projects")
      .update({ desired_due_date: p.start_date, updated_due_date: p.end_date })
      .eq("id", p.id);
    if (error) throw error;
  } else if (p.entity_type === "request") {
    const { error } = await supabase
      .from("requests")
      .update({ due_date: p.end_date })
      .eq("id", p.id);
    if (error) throw error;
  }
}