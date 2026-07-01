import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";

export interface DepartmentRow {
  id: string;
  name: string;
  is_active: boolean;
  display_order: number | null;
  updated_at?: string;
}

export const departmentKeys = {
  active: ["departments", "active"] as const,
  all: ["departments", "all"] as const,
};


/** Demo departments for the preview/demo path (no live DB). Lets the Easy Request
 *  and other department-gated forms be testable without `supabase db push`. */
const DEMO_DEPARTMENTS: DepartmentRow[] = [
  { id: "dept-art", name: "Art Department", is_active: true, display_order: 1 },
  { id: "dept-mkt", name: "Marketing", is_active: true, display_order: 2 },
  { id: "dept-it", name: "Information Technology", is_active: true, display_order: 3 },
  { id: "dept-fin", name: "Finance", is_active: true, display_order: 4 },
  { id: "dept-exec", name: "Executive", is_active: true, display_order: 5 },
  { id: "dept-ops", name: "Operations", is_active: true, display_order: 6 },
];

export function useActiveDepartments() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: departmentKeys.active,
    queryFn: async (): Promise<DepartmentRow[]> => {
      if (isPreviewEnvironment()) return DEMO_DEPARTMENTS;
      const { data, error } = await supabase
        .from("active_departments" as never)
        .select("id,name,display_order")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as Array<{ id: string; name: string; display_order: number | null }>).map(
        (d) => ({ ...d, is_active: true }),
      );
    },
    staleTime: 60_000,
  });

  const channelName = useRef(
    `realtime-departments-active-${Math.random().toString(36).slice(2)}`,
  );
  useEffect(() => {
    if (isPreviewEnvironment()) return;
    const ch = supabase
      .channel(channelName.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "departments" }, () => {
        qc.invalidateQueries({ queryKey: departmentKeys.active });
        qc.invalidateQueries({ queryKey: departmentKeys.all });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  return query;
}

export function useAllDepartments() {
  return useQuery({
    queryKey: departmentKeys.all,
    queryFn: async (): Promise<DepartmentRow[]> => {
      if (isPreviewEnvironment()) return DEMO_DEPARTMENTS;
      const { data, error } = await supabase
        .from("departments")
        .select("id,name,is_active,display_order,updated_at")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DepartmentRow[];
    },
  });
}

/**
 * Resolve a free-text department name (e.g. the M365 Organization department synced
 * from Graph into profile.department) to an existing department row id, matching by
 * name case- and space-insensitively. Returns null if the name is empty or no active
 * department matches — callers then fall back to manual selection. Never creates rows.
 */
export function matchDepartmentByName(
  name: string | null | undefined,
  departments: DepartmentRow[],
): string | null {
  if (!name) return null;
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const target = norm(name);
  if (!target) return null;
  const match = departments.find((d) => norm(d.name) === target);
  return match?.id ?? null;
}

export async function fetchDepartmentById(id: string): Promise<DepartmentRow | null> {
  if (!id) return null;
  const { data, error } = await supabase
    .from("departments")
    .select("id,name,is_active,display_order")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as DepartmentRow) ?? null;
}