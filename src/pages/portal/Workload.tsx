/**
 * Team Workload — the honest answer to "who is drowning and who has room?"
 *
 * Measures each person's TOTAL open workload — art requests they lead, projects
 * they own or are a stakeholder on, and tasks assigned to them — against a weekly
 * points budget (src/lib/workloadMetrics.ts `buildTotalLoad`). Every open item
 * scores by kind (owner 3 ≫ stakeholder 1.5 ≫ task 1; requests keep priority ×
 * type), is windowed by due date, and is measured against capacity — the same
 * weights the Network graph uses, so the report and the graph agree. The hero is
 * a horizontal bar chart with a vermilion capacity line; per-person cards drill
 * into the items that built each total. Numbers are honest — there is no time
 * tracking, and a footnote says so. Preview is self-contained (demo requests via
 * useQueue(), demo tasks/projects via the flat query helpers).
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
import { useQuery } from "@tanstack/react-query";
import { useQueue } from "@/hooks/useRequests";
import { useTasksFlat, useProjectsFlat } from "@/hooks/use-queries";
import { useAuth } from "@/hooks/useAuth";
import { fetchDirectory } from "@/lib/directory";
import { buildOrgTree, flattenOrg, type OrgPerson } from "@/lib/orgChart";
import { dueLabel, dueUrgency } from "@/lib/dueDate";
import { cn } from "@/lib/utils";
import {
  buildTotalLoad,
  comparePeople,
  DEFAULT_WEEKLY_CAPACITY_WLP,
  UNASSIGNED_KEY,
  type Band,
  type LoadItem,
  type PersonTotalLoad,
  type SortKey,
  type WindowKey,
} from "@/lib/workloadMetrics";
import { getWorkloadPrefs, setWorkloadPrefs } from "@/lib/workloadPrefs";
import type { ProjectWithMeta } from "@/types/projects";
import type { RequestStatus } from "@/types/request";

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

/** LoadItem.kind → the route + avatar entity type for the drill-in link. */
const KIND_ROUTE: Record<LoadItem["kind"], string> = {
  request: "/requests",
  project: "/projects",
  task: "/tasks",
};
const KIND_AVATAR: Record<LoadItem["kind"], "request" | "project" | "task"> = {
  request: "request",
  project: "project",
  task: "task",
};
const KIND_LABEL: Record<LoadItem["kind"], string> = {
  request: "Request",
  project: "Project",
  task: "Task",
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
/** Entity-hued bars for the work-by-type breakdown (Requests / Projects / Tasks). */
const TYPE_COLORS = ["hsl(var(--entity-request))", "hsl(var(--entity-project))", "hsl(var(--entity-task))"];
/** Due-date health order: Overdue, Due soon, On track, No date. */
const HEALTH_COLORS = [
  "hsl(var(--destructive))",
  "hsl(var(--warning))",
  "hsl(var(--status-done))",
  "hsl(var(--muted-foreground))",
];

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

/**
 * Banded capacity track. The 100%-capacity tick sits at 2/3 of the track, leaving
 * headroom so an over-capacity person's striped overflow renders INSIDE the card
 * instead of running off the right edge (the old version positioned it at
 * left:100%, so at 195% it stuck out past the card). Bar length saturates at 150%
 * utilization; the exact "%" and the "X% over" badge carry the real number beyond.
 */
function CapacityBar({ util, band }: { util: number; band: Band }) {
  const DISPLAY_MAX = 1.5; // top of the track = 150% of weekly capacity
  const capMark = (1 / DISPLAY_MAX) * 100; // the 100%-capacity tick (~66.7%)
  const fillPct = (Math.min(Math.max(util, 0), 1) / DISPLAY_MAX) * 100; // up-to-capacity
  const overPct = (Math.min(Math.max(util - 1, 0), DISPLAY_MAX - 1) / DISPLAY_MAX) * 100; // beyond
  return (
    <div
      className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={Math.round(util * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Percent of weekly capacity"
    >
      {/* up-to-capacity fill */}
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${fillPct}%`, background: `hsl(var(${BAND_TOKEN[band]}))` }}
      />
      {/* over-capacity stripe, butted onto the fill — stays within the track */}
      {overPct > 0 && (
        <div
          className="absolute inset-y-0"
          style={{
            left: `${fillPct}%`,
            width: `${overPct}%`,
            background:
              "repeating-linear-gradient(45deg,hsl(var(--destructive)),hsl(var(--destructive)) 3px,transparent 3px,transparent 6px)",
          }}
        />
      )}
      {/* 100%-capacity tick */}
      <div className="absolute inset-y-0 w-px bg-foreground/50" style={{ left: `${capMark}%` }} aria-hidden />
    </div>
  );
}

/** Small neutral kind badge ("Project" / "Task") for non-request contributions. */
function KindBadge({ kind }: { kind: LoadItem["kind"] }) {
  const token = kind === "project" ? "--entity-project" : "--entity-task";
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: `hsl(var(${token}) / 0.14)`, color: `hsl(var(${token}))` }}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}

/** One drill-in row: any LoadItem as a link + its per-item WLP contribution.
 *  Requests keep priority + status chips; projects/tasks show a kind badge + role. */
function LoadItemRow({ item }: { item: LoadItem }) {
  const urgency = dueUrgency(item.due_date);
  // The link target uses the underlying entity id (strip the synthetic prefix we
  // add to make LoadItem ids unique across kinds/roles).
  const entityId = item.id.includes(":") ? item.id.split(":")[1] : item.id;
  return (
    <li>
      <Link
        to={`${KIND_ROUTE[item.kind]}/${entityId}`}
        className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-accent/40"
      >
        <EntityAvatar type={KIND_AVATAR[item.kind]} seed={item.id} name={item.title} size="xs" />
        <span className="flex-1 truncate text-foreground">{item.title}</span>
        {item.due_date && (
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
            {dueLabel(item.due_date)}
          </span>
        )}
        {item.kind === "request" ? (
          <>
            {item.priority && <PriorityBadge priority={item.priority} />}
            {item.status && <StatusBadge status={item.status as RequestStatus} />}
          </>
        ) : (
          <>
            <KindBadge kind={item.kind} />
            {item.role && (
              <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">{item.role}</span>
            )}
          </>
        )}
        <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground">
          {item.points.toFixed(1)} pts
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
  load: PersonTotalLoad;
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
          {shown.map((item) => (
            <LoadItemRow key={item.id} item={item} />
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

/** Build a user_id → display-name directory from everything we know locally:
 *  project stakeholders (they carry full_name), plus the current signed-in user.
 *  Any task/project owner id not covered here falls back to a short id label in
 *  buildTotalLoad (never blank). This keeps preview fully self-contained. */
function useDirectory(projects: ProjectWithMeta[]): Map<string, string> {
  const { user, profile } = useAuth();
  return useMemo(() => {
    const dir = new Map<string, string>();
    for (const p of projects) {
      for (const s of p.stakeholders ?? []) {
        if (s.user_id && s.full_name && s.full_name.trim() && !dir.has(s.user_id)) {
          dir.set(s.user_id, s.full_name.trim());
        }
      }
    }
    // The signed-in user — so someone with only tasks/projects (e.g. the admin)
    // is named, not shown as an id. Their profile name wins for their own id.
    const meId = user?.id ?? profile?.user_id ?? null;
    const meName = profile?.full_name ?? null;
    if (meId && meName && meName.trim()) dir.set(meId, meName.trim());
    return dir;
  }, [projects, user?.id, profile?.user_id, profile?.full_name]);
}

/**
 * Access scope for the Workload view (ACL). Admins see everyone's load (it's
 * metadata — counts + ownership, not project detail — so no authorization is
 * needed). A non-admin (manager/lead) sees ONLY their reporting subtree within
 * their own department, plus their own row. Enforced here at the view; the real
 * data boundary is RLS. Returns null `allowedKeys` = "see all" (admin).
 *
 * Workload people are keyed by lowercased name, so the allowed set carries both
 * each subordinate's full name and their first name (request leads are often
 * recorded first-name-only).
 */
function useWorkloadScope(): { isAdmin: boolean; allowedKeys: Set<string> | null } {
  const { user, profile } = useAuth();
  const isAdmin = !!profile?.is_admin || profile?.role === "admin";
  const { data: directory = [] } = useQuery({
    queryKey: ["workload-directory"],
    queryFn: fetchDirectory,
    staleTime: 5 * 60_000,
    enabled: !isAdmin, // admins see all → no need to fetch the org
  });

  return useMemo(() => {
    if (isAdmin) return { isAdmin: true, allowedKeys: null };

    const meId = user?.id ?? profile?.user_id ?? null;
    const meEmail = (profile?.email ?? user?.email ?? null)?.toLowerCase() ?? null;

    // Map email → id so manager_email links resolve to a manager id.
    const idByEmail = new Map<string, string>();
    for (const p of directory) {
      const id = p.user_id ?? (p.email ? `email:${p.email.toLowerCase()}` : null);
      if (id && p.email) idByEmail.set(p.email.toLowerCase(), id);
    }
    const orgPeople: OrgPerson[] = directory.map((p) => ({
      id: p.user_id ?? (p.email ? `email:${p.email.toLowerCase()}` : p.full_name ?? "?"),
      name: p.full_name ?? p.email ?? "Unknown",
      department: p.department ?? undefined,
      managerId: p.manager_email ? idByEmail.get(p.manager_email.toLowerCase()) ?? null : null,
    }));

    // Locate the viewer in the directory (by id, then email).
    const me =
      orgPeople.find((p) => meId && p.id === meId) ??
      orgPeople.find((p) => meEmail && p.id === `email:${meEmail}`) ??
      orgPeople.find((p) => {
        const dp = directory.find((d) => d.user_id === p.id || (d.email && `email:${d.email.toLowerCase()}` === p.id));
        return meEmail && dp?.email?.toLowerCase() === meEmail;
      }) ?? null;

    const keys = new Set<string>();
    const addName = (n?: string | null) => {
      if (!n) return;
      const full = n.trim().toLowerCase();
      if (full) { keys.add(full); keys.add(full.split(/\s+/)[0]); }
    };

    // Always allow the viewer's own row.
    addName(profile?.full_name ?? me?.name ?? null);

    if (me) {
      const forest = buildOrgTree(orgPeople);
      const all = flattenOrg(forest);
      const meNode = all.find((n) => n.person.id === me.id) ?? null;
      const myDept = me.department;
      if (meNode) {
        for (const n of flattenOrg([meNode])) {
          // Subordinates within the viewer's department (undefined dept = don't restrict).
          if (!myDept || n.person.department === myDept) addName(n.person.name);
        }
      }
    }

    return { isAdmin: false, allowedKeys: keys };
  }, [isAdmin, directory, user?.id, user?.email, profile?.user_id, profile?.email, profile?.full_name]);
}

export default function Workload() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { data: requestData, isLoading: requestsLoading } = useQueue();
  const { tasks, isLoading: tasksLoading } = useTasksFlat();
  const { projects, isLoading: projectsLoading } = useProjectsFlat();

  const requests = useMemo(() => requestData ?? [], [requestData]);
  const isLoading = requestsLoading || tasksLoading || projectsLoading;

  const directory = useDirectory(projects);

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

  const { isAdmin, allowedKeys } = useWorkloadScope();

  const fullTeam = useMemo(
    () => buildTotalLoad({ requests, tasks, projects }, directory, win),
    [requests, tasks, projects, directory, win],
  );

  // ACL: a non-admin sees only their subtree (+ self); recompute team totals from
  // the visible set so the KPIs reflect what they're allowed to see. Admins (null
  // allowedKeys) see the full team unchanged.
  const team = useMemo(() => {
    if (allowedKeys === null) return fullTeam;
    // Only the viewer's subtree — no Unassigned bucket (not their subordinate).
    const scored = fullTeam.people.filter(
      (p) => p.person.key !== UNASSIGNED_KEY && allowedKeys.has(p.person.key),
    );
    const totalPoints = Math.round(scored.reduce((s, p) => s + p.points, 0) * 10) / 10;
    const totalCapacity = scored.reduce((s, p) => s + p.capacity, 0);
    return {
      ...fullTeam,
      people: scored,
      totalPoints,
      totalCapacity,
      teamUtil: totalCapacity > 0 ? totalPoints / totalCapacity : 0,
      overCount: scored.filter((p) => p.band === "over").length,
      unassignedPoints: 0,
    };
  }, [fullTeam, allowedKeys]);

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

  // Total open contributions surfaced in the current window (across all people).
  const openItemCount = useMemo(
    () => team.people.reduce((s, p) => s + p.count, 0),
    [team.people],
  );

  // Breakdown of the SAME scoped work, presented as a report: composition by kind
  // (requests / projects / tasks) and by due-date health, aggregated across
  // everyone in scope. This is what merges the old standalone Reports view into
  // Workload — one dataset, one presents points, this presents the mix.
  const breakdown = useMemo(() => {
    const items = team.people.flatMap((p) => p.items);
    const typeCount = { request: 0, project: 0, task: 0 };
    const health: Record<string, number> = { overdue: 0, soon: 0, normal: 0, none: 0 };
    for (const it of items) {
      typeCount[it.kind] += 1;
      const k = dueUrgency(it.due_date ?? null);
      health[k] += 1;
    }
    return {
      total: items.length,
      byType: [
        { name: "Requests", value: typeCount.request },
        { name: "Projects", value: typeCount.project },
        { name: "Tasks", value: typeCount.task },
      ],
      dueHealth: [
        { name: "Overdue", value: health.overdue },
        { name: "Due soon", value: health.soon },
        { name: "On track", value: health.normal },
        { name: "No date", value: health.none },
      ],
    };
  }, [team.people]);

  const kpis: Kpi[] = [
    { value: team.people.length, label: "people" },
    { value: team.totalPoints.toFixed(1), label: "open-work points", hint: <GlossaryHint term="workloadPoints" /> },
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
        title={isAdmin ? "Team Workload" : team.people.length > 1 ? "My Team's Workload" : "My Workload"}
        subtitle={
          isLoading
            ? "Everything assigned to you and your team — requests, projects, and tasks"
            : `${isAdmin ? "Everyone" : team.people.length > 1 ? "You + your reports" : "Your work"} · requests + projects + tasks vs weekly capacity · ${openItemCount} open item${openItemCount === 1 ? "" : "s"}`
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
              description="Try a wider window (All open), or new work will appear here as it comes in."
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

          {/* Breakdown — the same scoped work, presented as a report */}
          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard
              title="Open work by type"
              description="Requests, projects, and tasks across everyone in scope"
              isEmpty={breakdown.total === 0}
            >
              <BarChart data={breakdown.byType} margin={{ top: 16, right: 12, bottom: 4, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} width={32} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
                  {breakdown.byType.map((_, i) => (
                    <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                  ))}
                  <LabelList dataKey="value" position="top" style={labelStyle} />
                </Bar>
              </BarChart>
            </ChartCard>

            <ChartCard
              title="Due-date health"
              description="Open items across everyone in scope, by deadline"
              isEmpty={breakdown.total === 0}
              hint={<GlossaryHint term="dueHealth" />}
            >
              <BarChart data={breakdown.dueHealth} margin={{ top: 16, right: 12, bottom: 4, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} width={32} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
                  {breakdown.dueHealth.map((_, i) => (
                    <Cell key={i} fill={HEALTH_COLORS[i % HEALTH_COLORS.length]} />
                  ))}
                  <LabelList dataKey="value" position="top" style={labelStyle} />
                </Bar>
              </BarChart>
            </ChartCard>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeader label="People" count={people.length} />
            <div className="flex items-center gap-3">
              {/* Unassigned work only exists in the full (admin) view. */}
              {isAdmin && (
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
              )}
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
          Workload counts open requests (priority × type), projects (owner 3 / stakeholder 1.5), and
          tasks (1) — no time tracking. Capacity is a weekly points budget of{" "}
          {DEFAULT_WEEKLY_CAPACITY_WLP} — a planning heuristic, not a clock.
        </p>
      </TooltipProvider>
    </div>
  );
}
