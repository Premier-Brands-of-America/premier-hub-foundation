import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import { demoListAll } from "@/lib/demoRequestsStore";
import { demoBoard } from "@/features/planner/demoData";
import { useActiveDepartments } from "@/hooks/useDepartments";
import { buildReportItems, type ReportItem } from "@/lib/reportsMetrics";
import type { ArtRequest } from "@/types/request";
import type { Board } from "@/features/planner/types";

async function fetchAllRequests(): Promise<ArtRequest[]> {
  if (isPreviewEnvironment()) return demoListAll();
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ArtRequest[];
}

/**
 * Assembles the normalized Reports dataset. In preview it spans the art-request
 * demo store and the planner demo board (tasks + projects); in production it
 * reads the requests table (planner board folding is preview-only — see
 * DECISIONS.md).
 */
export function useReportData(): { items: ReportItem[]; isLoading: boolean } {
  const requestsQuery = useQuery({ queryKey: ["report-requests"], queryFn: fetchAllRequests });
  const departmentsQuery = useActiveDepartments();

  const board: Board | null = isPreviewEnvironment() ? demoBoard() : null;

  const items = useMemo(
    () => buildReportItems(requestsQuery.data ?? [], board, departmentsQuery.data ?? []),
    [requestsQuery.data, board, departmentsQuery.data],
  );

  return { items, isLoading: requestsQuery.isLoading || departmentsQuery.isLoading };
}
