import { useMemo, useState } from "react";
import { ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { RequestListItem } from "@/components/requests/RequestListItem";
import { RequestStatBand } from "@/components/requests/RequestStatBand";
import { prettyLabel } from "@/components/requests/requestBadges";
import { useQueue } from "@/hooks/useRequests";
import { useActiveDepartments } from "@/hooks/useDepartments";
import { byPriorityThenDue, requestCustomer } from "@/lib/requestMeta";
import { dueUrgency } from "@/lib/dueDate";
import type { ArtRequest } from "@/types/request";

type SortKey = "priority" | "due";

function bySoonestDue(a: ArtRequest, b: ArtRequest): number {
  const ad = a.due_date ? Date.parse(a.due_date) : Infinity;
  const bd = b.due_date ? Date.parse(b.due_date) : Infinity;
  if (ad !== bd) return ad - bd;
  return byPriorityThenDue(a, b);
}

export default function Queue() {
  const { data, isLoading } = useQueue();
  const { data: departments } = useActiveDepartments();
  const [status, setStatus] = useState<string>("all");
  const [customer, setCustomer] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("priority");

  const deptName = useMemo(() => {
    const map = new Map((departments ?? []).map((d) => [d.id, d.name]));
    return (id: string) => map.get(id) ?? null;
  }, [departments]);

  const requests = useMemo(() => data ?? [], [data]);

  const statuses = useMemo(
    () => Array.from(new Set(requests.map((r) => r.status))),
    [requests],
  );
  const customers = useMemo(
    () =>
      Array.from(
        new Set(requests.map(requestCustomer).filter((c): c is string => Boolean(c))),
      ).sort(),
    [requests],
  );

  const stats = useMemo(
    () => [
      { label: "Open", value: requests.length },
      {
        label: "Urgent",
        value: requests.filter((r) => r.priority === "urgent").length,
        tone: "--priority-urgent",
      },
      {
        label: "Overdue",
        value: requests.filter((r) => dueUrgency(r.due_date) === "overdue").length,
        tone: "--destructive",
      },
    ],
    [requests],
  );

  const visible = useMemo(() => {
    const filtered = requests.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (customer === "all" || requestCustomer(r) === customer),
    );
    return [...filtered].sort(sort === "priority" ? byPriorityThenDue : bySoonestDue);
  }, [requests, status, customer, sort]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-3 sm:p-4 md:p-6">
      <PageHeader title="Queue" subtitle="Open art requests to triage and assign" />

      {!isLoading && requests.length > 0 && <RequestStatBand stats={stats} />}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] w-full" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<ListChecks className="h-6 w-6" />}
              title="The queue is clear"
              description="There are no open requests right now. New submissions will appear here."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {visible.length} open request{visible.length === 1 ? "" : "s"}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 w-[160px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {prettyLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {customers.length > 0 && (
                <Select value={customer} onValueChange={setCustomer}>
                  <SelectTrigger className="h-8 w-[160px]">
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All customers</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-8 w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Sort: Priority</SelectItem>
                  <SelectItem value="due">Sort: Due date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {visible.length === 0 ? (
            <Card>
              <CardContent className="py-10">
                <EmptyState
                  icon={<ListChecks className="h-6 w-6" />}
                  title="No requests match these filters"
                  description="Try clearing the status or customer filter."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {visible.map((r) => (
                <RequestListItem key={r.id} request={r} departmentName={deptName(r.department_id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
