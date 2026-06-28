import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/hooks/useAuth";
import { useMyRequests } from "@/hooks/useRequests";
import { useActiveDepartments } from "@/hooks/useDepartments";
import type { RequestStatus } from "@/types/request";

const STATUS_OPTIONS: RequestStatus[] = [
  "submitted",
  "in_review",
  "assigned",
  "in_progress",
  "waiting_on_info",
  "internal_review",
  "sent_for_approval",
  "complete",
  "archived",
];

export default function MyRequests() {
  const { user, profile } = useAuth();
  const userId = user?.id ?? profile?.user_id ?? null;
  const { data, isLoading } = useMyRequests(userId);
  const { data: departments } = useActiveDepartments();
  const [status, setStatus] = useState<string>("all");

  const deptName = useMemo(() => {
    const map = new Map((departments ?? []).map((d) => [d.id, d.name]));
    return (id: string) => map.get(id) ?? null;
  }, [departments]);

  const requests = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(
    () => (status === "all" ? requests : requests.filter((r) => r.status === status)),
    [requests, status],
  );

  const stats = useMemo(
    () => [
      { label: "Total", value: requests.length },
      {
        label: "Active",
        value: requests.filter((r) => r.status !== "complete" && r.status !== "archived").length,
      },
      {
        label: "Complete",
        value: requests.filter((r) => r.status === "complete").length,
        tone: "--status-done",
      },
    ],
    [requests],
  );

  const newRequestCta = (
    <Button asChild size="sm" className="gap-1.5">
      <Link to="/requests/new">
        <Plus className="h-3.5 w-3.5" /> New request
      </Link>
    </Button>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-3 sm:p-4 md:p-6">
      <PageHeader
        title="My Requests"
        subtitle="Track the art requests you've submitted"
        actions={newRequestCta}
      />

      {!isLoading && requests.length > 0 && <RequestStatBand stats={stats} />}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] w-full" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<Inbox className="h-6 w-6" />}
              title="You haven't submitted any requests yet"
              description="Start a new art request and it will show up here with its status."
              action={newRequestCta}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {filtered.length} of {requests.length} request{requests.length === 1 ? "" : "s"}
            </p>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {prettyLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-10">
                <EmptyState
                  icon={<Inbox className="h-6 w-6" />}
                  title="No requests match this filter"
                  description="Try a different status."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => (
                <RequestListItem key={r.id} request={r} departmentName={deptName(r.department_id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
