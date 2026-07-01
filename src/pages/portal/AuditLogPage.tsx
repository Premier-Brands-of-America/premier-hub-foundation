import { useMemo, useState } from "react";
import { ScrollText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { EntityAvatar } from "@/components/common/EntityAvatar";
import { useAuditLog } from "@/hooks/useAuditLog";
import {
  type AuditArea,
  type AuditEntry,
  AUDIT_AREAS,
  AREA_LABEL,
} from "@/lib/demoAuditStore";

const ALL = "all";

/** "feature_flag.toggled" → "Feature Flag Toggled" */
function prettyKind(kind: string): string {
  return kind
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function relativeTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function AreaPill({ area }: { area: AuditArea }) {
  return (
    <span
      className="inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-[11px] font-medium"
      style={{
        backgroundColor: "hsl(var(--status-info) / 0.14)",
        color: "hsl(var(--status-info))",
      }}
    >
      {AREA_LABEL[area]}
    </span>
  );
}

export default function AuditLogPage() {
  const { data, isLoading } = useAuditLog();

  const [area, setArea] = useState<string>(ALL);
  const [actor, setActor] = useState<string>(ALL);
  const [actionKind, setActionKind] = useState<string>(ALL);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const entries = useMemo(() => data ?? [], [data]);

  const actors = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) if (e.actor_id && !map.has(e.actor_id)) map.set(e.actor_id, e.actor_name || "—");
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [entries]);

  const actionKinds = useMemo(
    () => Array.from(new Set(entries.map((e) => e.action_kind).filter(Boolean))).sort(),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Inclusive date bounds: from start-of-day, to end-of-day.
    const fromMs = from ? new Date(from + "T00:00:00").getTime() : null;
    const toMs = to ? new Date(to + "T23:59:59.999").getTime() : null;

    return entries.filter((e: AuditEntry) => {
      if (area !== ALL && e.area !== area) return false;
      if (actor !== ALL && e.actor_id !== actor) return false;
      if (actionKind !== ALL && e.action_kind !== actionKind) return false;

      const created = new Date(e.created_at).getTime();
      if (fromMs !== null && created < fromMs) return false;
      if (toMs !== null && created > toMs) return false;

      if (q) {
        const haystack = [e.actor_name, e.action, e.entity_label, e.entity_type]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [entries, area, actor, actionKind, from, to, search]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-3 sm:p-4 md:p-6">
      <PageHeader title="Audit Log" subtitle="A record of changes across the portal" />

      <Card>
        <CardContent className="space-y-4 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger className="h-8 w-[150px]">
                <SelectValue placeholder="All areas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All areas</SelectItem>
                {AUDIT_AREAS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {AREA_LABEL[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={actor} onValueChange={setActor}>
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue placeholder="All actors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All actors</SelectItem>
                {actors.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={actionKind} onValueChange={setActionKind}>
              <SelectTrigger className="h-8 w-[170px]">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All actions</SelectItem>
                {actionKinds.map((k) => (
                  <SelectItem key={k} value={k}>
                    {prettyKind(k)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 w-[150px]"
              aria-label="From date"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 w-[150px]"
              aria-label="To date"
            />

            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actor, action, target…"
              className="h-8 w-full sm:w-[240px]"
              aria-label="Search audit log"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<ScrollText className="h-6 w-6" />}
              title={
                entries.length === 0
                  ? "No audit activity yet"
                  : "No entries match these filters"
              }
              description={
                entries.length === 0
                  ? "Tracked actions and their authors will be listed here."
                  : "Try clearing a filter or widening the date range."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="align-top">
                      <div className="flex items-center gap-2">
                        <EntityAvatar
                          type="user"
                          seed={e.actor_id}
                          name={e.actor_name}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">
                            {e.actor_name}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {e.actor_email}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{e.action}</span>
                        <AreaPill area={e.area} />
                      </div>
                      {e.detail && (
                        <div className="mt-0.5 text-xs text-muted-foreground">{e.detail}</div>
                      )}
                    </TableCell>

                    <TableCell className="align-top">
                      <div className="text-xs text-muted-foreground">{e.entity_type}</div>
                      <div className="text-foreground">{e.entity_label}</div>
                    </TableCell>

                    <TableCell className="align-top whitespace-nowrap">
                      <span
                        className="text-sm text-muted-foreground"
                        title={new Date(e.created_at).toLocaleString()}
                      >
                        {relativeTime(e.created_at)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
