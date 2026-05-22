import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";

type TableName =
  | "tasks"
  | "projects"
  | "project_stakeholders"
  | "project_updates"
  | "notifications"
  | "entity_relations"
  | "pages"
  | "page_links";

export function useRealtimeInvalidation(table: TableName, queryKey: string[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isPreviewEnvironment()) return;

    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, queryClient, ...queryKey]);
}

export function useRealtimeFilteredInvalidation(
  table: TableName,
  filterColumn: string,
  filterValue: string,
  queryKey: string[]
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isPreviewEnvironment() || !filterValue) return;

    const channel = supabase
      .channel(`realtime-${table}-${filterValue}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `${filterColumn}=eq.${filterValue}` },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filterColumn, filterValue, queryClient, ...queryKey]);
}
