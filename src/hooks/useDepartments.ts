import { useEffect } from "react";
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

export function useActiveDepartments() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: departmentKeys.active,
    queryFn: async (): Promise<DepartmentRow[]> => {
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

  useEffect(() => {
    if (isPreviewEnvironment()) return;
    const ch = supabase
      .channel("realtime-departments-active")
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