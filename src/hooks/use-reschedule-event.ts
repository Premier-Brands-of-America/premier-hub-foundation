import { useMutation, useQueryClient } from "@tanstack/react-query";
import { rescheduleEvent, type ReschedulePayload } from "@/services/timelineService";
import { toast } from "sonner";
import type { TimelineEvent } from "@/types/timeline";

interface Ctx {
  previousByKey: Array<[readonly unknown[], TimelineEvent[] | undefined]>;
  original?: { start: string | null; end: string | null };
}

export function useRescheduleEvent() {
  const qc = useQueryClient();

  return useMutation<void, Error, ReschedulePayload, Ctx>({
    mutationFn: rescheduleEvent,
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["timeline"] });
      const queries = qc.getQueriesData<TimelineEvent[]>({ queryKey: ["timeline"] });
      let original: { start: string | null; end: string | null } | undefined;
      const previousByKey: Ctx["previousByKey"] = [];
      for (const [key, data] of queries) {
        previousByKey.push([key, data]);
        if (!data) continue;
        const next = data.map((e) => {
          if (e.id !== payload.id || e.entity_type !== payload.entity_type) return e;
          if (!original) original = { start: e.start_date, end: e.end_date };
          return { ...e, start_date: payload.start_date, end_date: payload.end_date };
        });
        qc.setQueryData(key, next);
      }
      return { previousByKey, original };
    },
    onError: (err, _payload, ctx) => {
      if (ctx) {
        for (const [key, prev] of ctx.previousByKey) qc.setQueryData(key, prev);
      }
      toast.error("Failed to reschedule", { description: err.message });
    },
    onSuccess: (_data, payload, ctx) => {
      const original = ctx?.original;
      toast.success("Rescheduled", {
        description: `New date: ${payload.end_date}`,
        action:
          original && original.start && original.end
            ? {
                label: "Undo",
                onClick: () => {
                  void rescheduleEvent({
                    id: payload.id,
                    entity_type: payload.entity_type,
                    start_date: original.start as string,
                    end_date: original.end as string,
                  }).then(() => {
                    qc.invalidateQueries({ queryKey: ["timeline"] });
                    qc.invalidateQueries({ queryKey: ["tasks"] });
                    qc.invalidateQueries({ queryKey: ["projects"] });
                  });
                },
              }
            : undefined,
        duration: 5000,
      });
      qc.invalidateQueries({ queryKey: ["timeline"] });
      if (payload.entity_type === "task") {
        qc.invalidateQueries({ queryKey: ["tasks"] });
        qc.invalidateQueries({ queryKey: ["task", payload.id] });
      } else if (payload.entity_type === "project") {
        qc.invalidateQueries({ queryKey: ["projects"] });
        qc.invalidateQueries({ queryKey: ["project", payload.id] });
      } else {
        qc.invalidateQueries({ queryKey: ["requests"] });
      }
    },
  });
}