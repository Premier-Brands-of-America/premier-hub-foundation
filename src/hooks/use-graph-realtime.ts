import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";

const TABLES = ["entity_relations", "projects", "tasks", "requests", "pages"] as const;

export function useGraphRealtime() {
  const qc = useQueryClient();
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (isPreviewEnvironment()) return;
    const channels = TABLES.map((t) =>
      supabase
        .channel(`graph-rt-${t}`)
        .on("postgres_changes", { event: "*", schema: "public", table: t }, () => {
          if (timer.current) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => {
            qc.invalidateQueries({ queryKey: ["graph"] });
          }, 800);
        })
        .subscribe(),
    );
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [qc]);
}