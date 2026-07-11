/**
 * My Reports — a personal snapshot of the SIGNED-IN user's own work: the tasks
 * assigned to them and the projects they own or contribute to. Honest counts
 * only — open vs done, work by type, due-date health, and recent activity. No
 * time tracking. Reuses the shared ChartCard + KpiStrip so it matches the
 * Workload report's look. (The department's art-request analytics are separate.)
 */
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiStrip, type Kpi } from "@/components/pressroom/KpiStrip";
import { ChartCard } from "@/components/charts/ChartCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { GlossaryHint } from "@/lib/glossary";
import { useAuth } from "@/hooks/useAuth";
import { useTasksFlat, useProjectsFlat } from "@/hooks/use-queries";
import { dueUrgency } from "@/lib/dueDate";
import type { ProjectWithMeta } from "@/types/projects";

/** Health order: Overdue, Due soon, On track, No date. Data never wears the brand accent. */
const HEALTH_COLORS = [
  "hsl(var(--destructive))",
  "hsl(var(--warning))",
  "hsl(var(--status-done))",
  "hsl(var(--muted-foreground))",
];
/** Tasks (azure) vs Projects (project hue). */
const TYPE_COLORS = ["hsl(var(--entity-task))", "hsl(var(--entity-project))"];
/** Open (in-progress) vs Completed (jade). */
const STATUS_COLORS = ["hsl(var(--status-in-progress))", "hsl(var(--status-done))"];

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
} as const;
const legendStyle = { fontSize: 11, color: "hsl(var(--muted-foreground))" };
const axisTick = { fontSize: 11, fill: "hsl(var(--muted-foreground))" } as const;
const labelStyle = { fontSize: 11, fill: "hsl(var(--muted-foreground))" } as const;

interface Datum {
  name: string;
  value: number;
}
const sum = (d: Datum[]) => d.reduce((a, x) => a + x.value, 0);

const projectDue = (p: ProjectWithMeta) => p.desired_due_date ?? p.updated_due_date ?? null;

/** Big-number total drawn in the donut hole. */
function donutCenter(total: number, caption: string) {
  return ({ viewBox }: { viewBox?: { cx?: number; cy?: number } }) => {
    const cx = viewBox?.cx ?? 0;
    const cy = viewBox?.cy ?? 0;
    return (
      <g>
        <text
          x={cx}
          y={cy}
          dy={-2}
          textAnchor="middle"
          className="fill-foreground tabular-nums"
          style={{ fontSize: 24, fontWeight: 600 }}
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy}
          dy={16}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}
        >
          {caption}
        </text>
      </g>
    );
  };
}

function Donut({ data, colors, caption }: { data: Datum[]; colors: string[]; caption: string }) {
  return (
    <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        innerRadius={56}
        outerRadius={80}
        paddingAngle={2}
        cornerRadius={4}
        strokeWidth={0}
      >
        {data.map((_, i) => (
          <Cell key={i} fill={colors[i % colors.length]} />
        ))}
        <Label position="center" content={donutCenter(sum(data), caption)} />
      </Pie>
      <Tooltip contentStyle={tooltipStyle} />
      <Legend
        iconType="circle"
        iconSize={8}
        wrapperStyle={legendStyle}
        formatter={(value, entry) => {
          const n = (entry?.payload as { value?: number } | undefined)?.value ?? 0;
          return (
            <span style={{ color: "hsl(var(--muted-foreground))" }}>
              {value} <span style={{ color: "hsl(var(--foreground))", fontWeight: 600 }}>{n}</span>
            </span>
          );
        }}
      />
    </PieChart>
  );
}

export default function MyReports() {
  const { user, profile } = useAuth();
  const myId = user?.id ?? profile?.user_id ?? null;
  const { tasks, isLoading: tasksLoading } = useTasksFlat();
  const { projects, isLoading: projectsLoading } = useProjectsFlat();
  const isLoading = tasksLoading || projectsLoading;

  // Strictly the signed-in user's own work: tasks assigned to them, projects they
  // own or are a stakeholder on.
  const myTasks = useMemo(() => tasks.filter((t) => t.user_id === myId), [tasks, myId]);
  const myProjects = useMemo(
    () => projects.filter((p) => p.owner_id === myId || (p.stakeholders ?? []).some((s) => s.user_id === myId)),
    [projects, myId],
  );

  const model = useMemo(() => {
    const openTasks = myTasks.filter((t) => t.status === "active");
    const openProjects = myProjects.filter((p) => p.status === "active");
    const doneTasks = myTasks.filter((t) => t.status === "complete");
    const doneProjects = myProjects.filter((p) => p.status === "complete");

    const openDues = [...openTasks.map((t) => t.due_date), ...openProjects.map((p) => projectDue(p))];
    const health: Record<string, number> = { overdue: 0, soon: 0, normal: 0, none: 0 };
    for (const d of openDues) {
      const k = dueUrgency(d);
      health[k] = (health[k] ?? 0) + 1;
    }

    const MS_WEEK = 7 * 86_400_000;
    const now = Date.now();
    const created = [...myTasks.map((t) => t.created_at), ...myProjects.map((p) => p.created_at)];
    const activity: Datum[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = now - (i + 1) * MS_WEEK;
      const stop = now - i * MS_WEEK;
      const count = created.filter((c) => {
        const t = Date.parse(c);
        return t > start && t <= stop;
      }).length;
      activity.push({ name: i === 0 ? "This wk" : `-${i}w`, value: count });
    }

    return {
      openTasks,
      openProjects,
      doneCount: doneTasks.length + doneProjects.length,
      overdue: health.overdue,
      dueHealth: [
        { name: "Overdue", value: health.overdue },
        { name: "Due soon", value: health.soon },
        { name: "On track", value: health.normal },
        { name: "No date", value: health.none },
      ] as Datum[],
      byType: [
        { name: "Tasks", value: openTasks.length },
        { name: "Projects", value: openProjects.length },
      ] as Datum[],
      openVsDone: [
        { name: "Open", value: openTasks.length + openProjects.length },
        { name: "Completed", value: doneTasks.length + doneProjects.length },
      ] as Datum[],
      activity,
    };
  }, [myTasks, myProjects]);

  const kpis: Kpi[] = [
    { value: model.openTasks.length, label: "open tasks" },
    { value: model.openProjects.length, label: "open projects" },
    {
      value: model.overdue,
      label: "overdue",
      token: model.overdue > 0 ? "--destructive" : undefined,
      hint: <GlossaryHint term="dueHealth" />,
    },
    { value: model.doneCount, label: "completed" },
  ];

  const hasWork = myTasks.length + myProjects.length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-3 sm:p-4 md:p-6">
      <PageHeader
        title="My Reports"
        subtitle="Your tasks and projects — open work, due-date health, and recent activity"
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      ) : !hasWork ? (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="No tasks or projects yet"
          description="Tasks assigned to you and projects you own or contribute to will show up here."
        />
      ) : (
        <>
          <KpiStrip items={kpis} />
          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard
              title="Open work by type"
              description="Your open tasks vs projects"
              isEmpty={sum(model.byType) === 0}
            >
              <BarChart data={model.byType} margin={{ top: 16, right: 12, bottom: 4, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} width={32} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64}>
                  {model.byType.map((_, i) => (
                    <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                  ))}
                  <LabelList dataKey="value" position="top" style={labelStyle} />
                </Bar>
              </BarChart>
            </ChartCard>

            <ChartCard
              title="Due-date health"
              description="Your open items by deadline"
              isEmpty={sum(model.dueHealth) === 0}
              hint={<GlossaryHint term="dueHealth" />}
            >
              <Donut data={model.dueHealth} colors={HEALTH_COLORS} caption="Open" />
            </ChartCard>

            <ChartCard
              title="Open vs completed"
              description="All your tasks and projects"
              isEmpty={sum(model.openVsDone) === 0}
            >
              <Donut data={model.openVsDone} colors={STATUS_COLORS} caption="Total" />
            </ChartCard>

            <ChartCard
              title="Recent activity"
              description="Items created per week (last 8 weeks)"
              isEmpty={sum(model.activity) === 0}
            >
              <LineChart data={model.activity} margin={{ top: 16, right: 16, bottom: 4, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} width={32} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--status-in-progress))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "hsl(var(--status-in-progress))" }}
                  activeDot={{ r: 4 }}
                >
                  <LabelList dataKey="value" position="top" style={labelStyle} />
                </Line>
              </LineChart>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
