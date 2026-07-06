import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import type { TimelineEntityType, TimelineEvent } from "@/types/timeline";

const IS_PREVIEW = isPreviewEnvironment();

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mockTimeline(from: Date, to: Date, types?: TimelineEntityType[]): TimelineEvent[] {
  const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
  // Realistic art-department seed (never "Task 1 / Project 2") so preview reads
  // like the real thing. Distributed across the fetched range by fraction.
  const seed: {
    entity_type: TimelineEntityType;
    title: string;
    frac: number;
    span: number;
    status: string;
    color_hint: string | null;
  }[] = [
    { entity_type: "request", title: "CVS Caring Mill label proof", frac: 0.34, span: 1, status: "blocked", color_hint: "urgent" },
    { entity_type: "task", title: "Upload approved dielines", frac: 0.42, span: 0, status: "in_progress", color_hint: null },
    { entity_type: "request", title: "Target holiday cap art", frac: 0.46, span: 2, status: "in_progress", color_hint: "high" },
    { entity_type: "project", title: "Q3 packaging refresh", frac: 0.36, span: 4, status: "active", color_hint: null },
    { entity_type: "request", title: "Whole Foods signage", frac: 0.52, span: 3, status: "in_progress", color_hint: "urgent" },
    { entity_type: "request", title: "Trojan promo banner set", frac: 0.58, span: 2, status: "todo", color_hint: "medium" },
    { entity_type: "project", title: "Brand guidelines refresh", frac: 0.64, span: 5, status: "active", color_hint: null },
    { entity_type: "request", title: "Kroger summer endcap refresh", frac: 0.7, span: 2, status: "todo", color_hint: "high" },
  ];
  const all: TimelineEvent[] = seed.map((s, i) => {
    const startDate = new Date(from.getTime() + Math.floor(days * s.frac) * 86400000);
    const endDate = new Date(startDate.getTime() + s.span * 86400000);
    return {
      entity_type: s.entity_type,
      id: `mock-${s.entity_type}-${i}`,
      title: s.title,
      start_date: toIsoDate(startDate),
      end_date: toIsoDate(endDate),
      status: s.status,
      color_hint: s.color_hint,
      owner_id: null,
    };
  });
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