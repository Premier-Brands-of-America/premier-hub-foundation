import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EntityAvatar } from "@/components/common/EntityAvatar";
import { RequestStatBand } from "@/components/requests/RequestStatBand";
import { StatusBadge, PriorityBadge } from "@/components/requests/requestBadges";
import { useQueue } from "@/hooks/useRequests";
import { requestLead, byPriorityThenDue, type RequestPerson } from "@/lib/requestMeta";
import type { ArtRequest } from "@/types/request";

interface Bucket {
  person: RequestPerson;
  requests: ArtRequest[];
}

export default function Workload() {
  const { data, isLoading } = useQueue();
  const requests = useMemo(() => data ?? [], [data]);

  const buckets = useMemo<Bucket[]>(() => {
    const map = new Map<string, Bucket>();
    for (const req of requests) {
      const person = requestLead(req);
      const bucket = map.get(person.key) ?? { person, requests: [] };
      bucket.requests.push(req);
      map.set(person.key, bucket);
    }
    for (const b of map.values()) b.requests.sort(byPriorityThenDue);
    return Array.from(map.values()).sort((a, b) => b.requests.length - a.requests.length);
  }, [requests]);

  const maxLoad = buckets.reduce((m, b) => Math.max(m, b.requests.length), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-3 sm:p-4 md:p-6">
      <PageHeader title="Department Workload" subtitle="Open requests by assignee and lead" />

      {!isLoading && buckets.length > 0 && (
        <RequestStatBand
          stats={[
            { label: "People", value: buckets.length },
            { label: "Open requests", value: requests.length },
            { label: "Busiest", value: maxLoad, tone: "--entity-request" },
          ]}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full" />
          ))}
        </div>
      ) : buckets.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No open work to distribute"
              description="When requests are open, per-person capacity will appear here."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {buckets.map(({ person, requests: items }) => {
            const load = items.length;
            const pct = maxLoad > 0 ? Math.round((load / maxLoad) * 100) : 0;
            return (
              <Card key={person.key}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-center gap-3">
                    <EntityAvatar type="user" seed={person.key} name={person.name} size="lg" glow />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{person.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{person.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold tabular-nums text-foreground">{load}</p>
                      <p className="text-[11px] text-muted-foreground">
                        open request{load === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  {/* Relative load bar (against the busiest person). */}
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={load}
                    aria-valuemin={0}
                    aria-valuemax={maxLoad}
                  >
                    <div
                      className="h-full rounded-full bg-[hsl(var(--entity-request))]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <ul className="divide-y divide-border/60">
                    {items.map((r) => (
                      <li key={r.id}>
                        <Link
                          to={`/requests/${r.id}`}
                          className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-accent/40"
                        >
                          <EntityAvatar type="request" seed={r.id} name={r.title} size="xs" />
                          <span className="flex-1 truncate text-foreground">{r.title}</span>
                          <PriorityBadge priority={r.priority} />
                          <StatusBadge status={r.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
