/**
 * Team Workload — the honest answer to "who is drowning and who has room?"
 *
 * Replaces the old "% of the busiest person" bar with a weighted-points capacity
 * model (src/lib/workloadMetrics.ts): each open item scores priority × type, is
 * windowed by due date, and is measured against a weekly points budget. The hero
 * is a horizontal bar chart with a vermilion capacity line; per-person cards drill
 * into the items that built each total. Numbers are honest — there is no time
 * tracking, and a footnote says so. Preview reads demo requests via useQueue().
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Users, ChevronDown, Info } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EntityAvatar } from "@/components/common/EntityAvatar";
import { KpiStrip, type Kpi } from "@/components/pressroom/KpiStrip";
import { SectionHeader } from "@/components/pressroom/SectionHeader";
import { GlossaryHint } from "@/lib/glossary";
import { ChartCard } from "@/components/charts/ChartCard";
import { StatusBadge, PriorityBadge } from "@/components/requests/requestBadges";
import { useQueue } from "@/hooks/useRequests";
import { useAuth } from "@/hooks/useAuth";
import { dueLabel, dueUrgency } from "@/lib/dueDate";
import { cn } from "@/lib/utils";
import {
  buildTeamLoad,
  comparePeople,
  itemPoints,
  DEFAULT_WEEKLY_CAPACITY_WLP,
  UNASSIGNED_KEY,
  type Band,
  type PersonLoad,
  type SortKey,
  type WindowKey,
} from "@/lib/workloadMetrics";
import { getWorkloadPrefs, setWorkloadPrefs } from "@/lib/workloadPrefs";
import type { ArtRequest } from "@/types/request";

/** Band → design-system color token (never the crimson brand accent for data). */
const BAND_TOKEN: Record<Band, string> = {
  under: "--muted-foreground",
  healthy: "--status-done", // jade
  near: "--warning", // amber
  over: "--destructive", // vermilion
  unassigned: "--muted-foreground",
};

const WINDOW_LABEL: Record<WindowKey, string> = {
  this_week: "This week",
  next_week: "Next week",
  all_open: "All open",
};

const SORT_LABEL: Record<SortKey, string> = {
  util: "Utilization",
  points: "Points",
  name: "Name",
  overdue: "Overdue",
};

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
} as const;
const axisTick = { fontSize: 11, fill: "hsl(var(--muted-foreground))" } as const;
const labelStyle = { fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 600 } as const;

interface ChartRow {
  key: string;
  name: string;
  points: number;
  capacity: number;
  util: number;
  count: number;
  overdue: number;
  band: Band;
}

/** Honest custom tooltip: "Name — 6.5 pts / 10 cap · 65% · 4 open (1 overdue)". */
function WorkloadTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: ChartRow }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div style={tooltipStyle} className="px-2.5 py-1.5">
      <p className="font-semibold">{row.name}</p>
      <p className="text-muted-foreground">
        {row.points.toFixed(1)} pts / {row.capacity} cap · {Math.round(row.util * 100)}%
      </p>
      <p className="text-muted-foreground">
        {row.count} open{row.overdue > 0 ? ` (${row.overdue} overdue)` : ""}
      </p>
    </div>
  );
}

/**
 * The hero: horizontal bar chart, one row per person, points on X, a vermilion
 * capacity ReferenceLine, per-Cell band coloring. Clicking a bar selects the
 * person (expands their card). v1 uses uniform capacity → a single ReferenceLine.
 */
function CapacityByPersonChart({
  rows,
  capacity,
  onSelect,
}: {
  rows: ChartRow[];
  capacity: number;
  onSelect: (key: string) => void;
}) {
  const maxPoints = rows.reduce((m, r) => Math.max(m, r.points), 0);
  // Round the axis ceiling to a whole point so the tick reads "15", not
  // "14.700000000000001" (float artifact of maxPoints * 1.05).
  const xMax = Math.ceil(Math.max(capacity * 1.2, maxPoints * 1.05, 1));
  const height = Math.max(180, rows.length * 44);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 44, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis type="number" domain={[0, xMax]} axisLine={false} tickLine={false} tick={axisTick} allowDecimals />
        <YAxis type="category" dataKey="name" width={110} axisLine={false} tickLine={false} tick={axisTick} />
        <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<WorkloadTooltip />} />
        <ReferenceLine
          x={capacity}
          stroke="hsl(var(--destructive))"
          strokeDasharray="4 3"
          label={{ value: "Capacity", position: "top", fill: "hsl(var(--destructive))", fontSize: 11 }}
        />
        <Bar
          dataKey="points"
          radius={[0, 4, 4, 0]}
          maxBarSize={26}
          isAnimationActive={false}
          onClick={(d: unknown) => {
            const key = (d as { key?: string })?.key;
            if (key) onSelect(key);
          }}
          className="cursor-pointer"
        >
          {rows.map((r) => (
            <Cell key={r.key} fill={`hsl(var(${BAND_TOKEN[r.band]}))`} />
          ))}
          <LabelList
            dataKey="points"
            position="right"
            formatter={(v: unknown) => (typeof v === "number" ? v.toFixed(1) : String(v ?? ""))}
            style={labelStyle}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Banded capacity track with an overflow-stripe cap and a 100% capacity tick. */
function CapacityBar({ util, band }: { util: number; band: Band }) {
  const pct = Math.min(util, 1) * 100;
  const over = Math.max(util - 1, 0) * 100; // overflow beyond capacity
  return (
    <div
      className="relative h-2.5 w-full rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={Math.round(util * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Percent of weekly capacity"
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: `hsl(var(${BAND_TOKEN[band]}))` }}
      />
      {over > 0 && (
        <div
          className="absolute inset-y-0 rounded-r-full"
          style={{
            left: "100%",
            width: `${Math.min(over, 40)}%`,
            background:
              "repeating-linear-gradient(45deg,hsl(var(--destructive)),hsl(var(--destructive)) 3px,transparent 3px,transparent 6px)",
          }}
        />
      )}
      {/* capacity tick at 100% */}
      <div className="absolute inset-y-[-2px] w-px bg-foreground/40" style={{ left: "100%" }} aria-hidden />
    </div>
  );
}

/** One drill-in row: the request as a link + its per-item WLP contribution. */
function RequestRow({ r }: { r: ArtRequest }) {
  const urgency = dueUrgency(r.due_date);
  return (
    <li>
      <Link
        to={`/requests/${r.id}`}
        className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-accent/40"
      >
        <EntityAvatar type="request" seed={r.id} name={r.title} size="xs" />
        <span className="flex-1 truncate text-foreground">{r.title}</span>
        {r.due_date && (
          <span
            className="hidden shrink-0 text-xs tabular-nums sm:inline"
            style={{
              color:
                urgency === "overdue"
                  ? "hsl(var(--destructive))"
                  : urgency === "soon"
                    ? "hsl(var(--warning))"
                    : "hsl(var(--muted-foreground))",
            }}
          >
            {dueLabel(r.due_date)}
          </span>
        )}
        <PriorityBadge priority={r.priority} />
        <StatusBadge status={r.status} />
        <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground">
          {itemPoints(r).toFixed(1)} pts
        </span>
      </Link>
    </li>
  );
}

const COLLAPSE_AFTER = 4;

/** Per-person card: banded capacity bar + expandable item drill-in. */
function PersonLoadCard({
  load,
  selected,
  onSelect,
}: {
  load: PersonLoad;
  selected: boolean;
  onSelect: (key: string) => void;
}) {
  const { person, points, count, overdue, capacity, util, band, undatedPoints, items } = load;
  const isUnassigned = person.key === UNASSIGNED_KEY;
  const [expanded, setExpanded] = useState(false);
  const canCollapse = items.length > COLLAPSE_AFTER;
  const shown = expanded || !canCollapse ? items : items.slice(0, COLLAPSE_AFTER);
  const over = util > 1 ? Math.round((util - 1) * 100) : 0;

  return (
    <Card
      data-key={person.key}
      className={cn("scroll-mt-24", selected && "ring-1 ring-primary")}
      onClick={() => onSelect(person.key)}
    >
      <CardContent className="space-y-3 py-4">
        <header className="flex items-center gap-3">
          <EntityAvatar type="user" seed={person.key} name={person.name} size="lg" glow />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{person.name}</p>
            <p className="truncate text-xs text-muted-foreground">{person.title}</p>
          </div>
          <div className="text-right">
            <p
              className="text-lg font-semibold tabular-nums"
              style={{ color: `hsl(var(${BAND_TOKEN[band]}))` }}
            >
              {points.toFixed(1)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isUnassigned ? "unassigned" : `of ${capacity} pts · ${Math.round(util * 100)}%`}
            </p>
          </div>
        </header>

        {isUnassigned ? (
          // No capacity for the unassigned bucket — a neutral, unbanded track.
          <div className="h-2.5 w-full rounded-full bg-muted" aria-hidden />
        ) : (
          <CapacityBar util={util} band={band} />
        )}

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Badge variant="outline">{count} open</Badge>
          {over > 0 && (
            <Badge className="border-destructive/40 bg-destructive/10 text-destructive">{over}% over</Badge>
          )}
          {overdue > 0 && (
            <Badge className="border-destructive/40 bg-destructive/10 text-destructive">{overdue} overdue</Badge>
          )}
          {undatedPoints > 0 && <Badge variant="outline">{undatedPoints.toFixed(1)} undated</Badge>}
        </div>

        <ul className="divide-y divide-border/60">
          {shown.map((r) => (
            <RequestRow key={r.id} r={r} />
          ))}
        </ul>

        {canCollapse && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
            {expanded ? "Show less" : `Show ${items.length - COLLAPSE_AFTER} more`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export default function Workload() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { data, isLoading } = useQueue();
  const requests = useMemo(() => data ?? [], [data]);

  const initial = useMemo(() => getWorkloadPrefs(userId), [userId]);
  const [win, setWin] = useState<WindowKey>(initial.window);
  const [sort, setSort] = useState<SortKey>(initial.sort);
  const [showUnassigned, setShowUnassigned] = useState(initial.showUnassigned);
  const [selected, setSelected] = useState<string | null>(null);

  function persist(next: Partial<{ window: WindowKey; sort: SortKey; showUnassigned: boolean }>) {
    setWorkloadPrefs(userId, {
      window: next.window ?? win,
      sort: next.sort ?? sort,
      showUnassigned: next.showUnassigned ?? showUnassigned,
    });
  }

  const team = useMemo(() => buildTeamLoad(requests, win), [requests, win]);

  const people = useMemo(() => {
    const filtered = showUnassigned
      ? team.people
      : team.people.filter((p) => p.person.key !== UNASSIGNED_KEY);
    return [...filtered].sort(comparePeople(sort));
  }, [team.people, sort, showUnassigned]);

  const chartRows = useMemo<ChartRow[]>(
    () =>
      people.map((p) => ({
        key: p.person.key,
        name: p.person.name,
        points: p.points,
        capacity: p.capacity,
        util: p.util,
        count: p.count,
        overdue: p.overdue,
        band: p.band,
      })),
    [people],
  );

  const kpis: Kpi[] = [
    { value: team.people.length, label: "people" },
    { value: team.totalPoints.toFixed(1), label: "open points", hint: <GlossaryHint term="workloadPoints" /> },
    {
      value: team.overCount,
      label: "over capacity",
      token: team.overCount > 0 ? "--destructive" : undefined,
      hint: <GlossaryHint term="capacity" />,
    },
    {
      value: `${Math.round(team.teamUtil * 100)}%`,
      label: "team utilization",
      hint: <GlossaryHint term="utilization" />,
      token:
        team.teamUtil >= 1
          ? "--destructive"
          : team.teamUtil >= 0.85
            ? "--warning"
            : team.teamUtil >= 0.5
              ? "--status-done"
              : undefined,
    },
  ];

  const hasWork = people.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-3 sm:p-4 md:p-6">
      <PageHeader
        title="Team Workload"
        subtitle={
          isLoading
            ? "Weighted open work vs weekly capacity"
            : `Weighted open work vs weekly capacity · ${requests.length} open item${requests.length === 1 ? "" : "s"}`
        }
        actions={
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={win}
            onValueChange={(v) => {
              if (!v) return;
              const next = v as WindowKey;
              setWin(next);
              persist({ window: next });
            }}
          >
            {(Object.keys(WINDOW_LABEL) as WindowKey[]).map((w) => (
              <ToggleGroupItem key={w} value={w} className="text-xs">
                {WINDOW_LABEL[w]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      />

      {/* Team summary */}
      {!isLoading && (
        <div className="space-y-1">
          <KpiStrip items={kpis} />
          <p className="text-xs text-muted-foreground">
            {team.overCount} of {team.people.length} people over their weekly budget
            {team.unassignedPoints > 0 && ` • ${team.unassignedPoints.toFixed(1)} points unassigned`}.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-[220px] w-full" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full" />
          ))}
        </div>
      ) : !hasWork ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No open work in this window"
              description="Try a wider window (All open), or new requests will appear here as they come in."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Hero chart */}
          <ChartCard
            title="Capacity by person"
            description={`Open Workload Points vs the ${DEFAULT_WEEKLY_CAPACITY_WLP}-point weekly budget · ${WINDOW_LABEL[win]}`}
            bare
          >
            <CapacityByPersonChart
              rows={chartRows}
              capacity={DEFAULT_WEEKLY_CAPACITY_WLP}
              onSelect={(key) => {
                setSelected(key);
                const el = document.querySelector(`[data-key="${key}"]`);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            />
          </ChartCard>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeader label="People" count={people.length} />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={showUnassigned}
                  onCheckedChange={(c) => {
                    setShowUnassigned(c);
                    persist({ showUnassigned: c });
                  }}
                />
                Show unassigned
              </label>
              <Select
                value={sort}
                onValueChange={(v) => {
                  const next = v as SortKey;
                  setSort(next);
                  persist({ sort: next });
                }}
              >
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SORT_LABEL) as SortKey[]).map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      Sort: {SORT_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Per-person cards */}
          <div className="space-y-4">
            {people.map((load) => (
              <PersonLoadCard
                key={load.person.key}
                load={load}
                selected={selected === load.person.key}
                onSelect={setSelected}
              />
            ))}
          </div>
        </>
      )}

      {/* Honesty footnote (the §1.5 contract, made visible) */}
      <TooltipProvider>
        <p className="flex items-start gap-1.5 pt-2 text-[11px] leading-relaxed text-muted-foreground">
          <UiTooltip>
            <TooltipTrigger asChild>
              <Info className="mt-0.5 h-3 w-3 shrink-0 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              Capacity is a weekly points budget, not hours.
            </TooltipContent>
          </UiTooltip>
          Workload is weighted by priority and request type (no time tracking). Capacity is a weekly
          points budget of {DEFAULT_WEEKLY_CAPACITY_WLP} — a planning heuristic, not a clock.
        </p>
      </TooltipProvider>
    </div>
  );
}
