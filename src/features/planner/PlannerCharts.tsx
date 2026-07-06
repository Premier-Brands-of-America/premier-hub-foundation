/**
 * Planner-style dashboard charts — live, data-driven summaries of the board.
 * Status breakdown, by bucket, by priority, by assignee, and due-date health.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CheckCircle2,
  CalendarClock,
  Layers,
  Flag,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  statusBreakdown,
  byBucket,
  byPriority,
  byAssignee,
  dueHealth,
} from "./plannerMetrics";
import type { Board } from "./types";
import type { CountDatum } from "./plannerMetrics";

/** Status order: Not started, In progress, Completed. */
const STATUS_COLORS = [
  "hsl(var(--muted-foreground))",
  "hsl(var(--status-in-progress))",
  "hsl(var(--status-done))",
];
/** Health order: Overdue, Due soon, On track, No date. */
const HEALTH_COLORS = [
  "hsl(var(--destructive))",
  "hsl(var(--warning))",
  "hsl(var(--status-done))",
  "hsl(var(--muted-foreground))",
];
/** Priority order: Urgent, High, Medium, Low. */
const PRIORITY_COLORS = [
  "hsl(var(--priority-urgent))",
  "hsl(var(--priority-high))",
  "hsl(var(--priority-medium))",
  "hsl(var(--priority-low))",
];

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
};

const legendStyle = { fontSize: 11, color: "hsl(var(--muted-foreground))" };
const axisTick = { fontSize: 11, fill: "hsl(var(--muted-foreground))" } as const;
const labelStyle = { fontSize: 11, fill: "hsl(var(--muted-foreground))" } as const;

function ChartCard({
  title,
  description,
  icon: Icon,
  isEmpty,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isEmpty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {Icon ? (
            <Icon className="h-4 w-4 text-muted-foreground" />
          ) : null}
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="h-64">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/** Centered big-number total drawn in the donut hole. Rendered as recharts
 *  <Label> content so it's positioned at the pie's true center (cx/cy from the
 *  viewBox) and reliably mounts — raw SVG fragments passed straight to PieChart
 *  are dropped by recharts' child filter. */
function donutCenter(total: number) {
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
          Total
        </text>
      </g>
    );
  };
}

const sum = (data: CountDatum[]) => data.reduce((acc, d) => acc + d.value, 0);

export function PlannerCharts({ board }: { board: Board }) {
  const status = statusBreakdown(board);
  const buckets = byBucket(board);
  const priority = byPriority(board);
  const assignees = byAssignee(board);
  const health = dueHealth(board);

  const statusTotal = sum(status);
  const healthTotal = sum(health);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <ChartCard
        title="Status breakdown"
        description="Cards by current status"
        icon={CheckCircle2}
        isEmpty={statusTotal === 0}
      >
        <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Pie
            data={status}
            dataKey="value"
            nameKey="name"
            innerRadius={56}
            outerRadius={80}
            paddingAngle={2}
            cornerRadius={4}
            strokeWidth={0}
          >
            {status.map((_, i) => (
              <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
            ))}
            <Label position="center" content={donutCenter(statusTotal)} />
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={legendStyle}
          />
        </PieChart>
      </ChartCard>

      <ChartCard
        title="Due-date health"
        description="Cards by due-date urgency"
        icon={CalendarClock}
        isEmpty={healthTotal === 0}
      >
        <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Pie
            data={health}
            dataKey="value"
            nameKey="name"
            innerRadius={56}
            outerRadius={80}
            paddingAngle={2}
            cornerRadius={4}
            strokeWidth={0}
          >
            {health.map((_, i) => (
              <Cell key={i} fill={HEALTH_COLORS[i % HEALTH_COLORS.length]} />
            ))}
            <Label position="center" content={donutCenter(healthTotal)} />
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={legendStyle}
          />
        </PieChart>
      </ChartCard>

      <ChartCard
        title="By bucket"
        description="Cards per bucket"
        icon={Layers}
        isEmpty={buckets.length === 0}
      >
        <BarChart data={buckets} margin={{ top: 16, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={axisTick}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={axisTick}
            width={32}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} />
          <Bar dataKey="value" fill="hsl(var(--entity-task))" radius={[4, 4, 0, 0]} maxBarSize={40}>
            <LabelList dataKey="value" position="top" style={labelStyle} />
          </Bar>
        </BarChart>
      </ChartCard>

      <ChartCard
        title="By priority"
        description="Cards by priority level"
        icon={Flag}
        isEmpty={sum(priority) === 0}
      >
        <BarChart data={priority} margin={{ top: 16, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={axisTick}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={axisTick}
            width={32}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {priority.map((_, i) => (
              <Cell key={i} fill={PRIORITY_COLORS[i % PRIORITY_COLORS.length]} />
            ))}
            <LabelList dataKey="value" position="top" style={labelStyle} />
          </Bar>
        </BarChart>
      </ChartCard>

      <ChartCard
        title="By assignee / lead"
        description="Cards per assignee"
        icon={Users}
        isEmpty={assignees.length === 0}
      >
        <BarChart
          data={assignees}
          layout="vertical"
          margin={{ top: 4, right: 28, bottom: 4, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={axisTick}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            axisLine={false}
            tickLine={false}
            tick={axisTick}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} />
          <Bar dataKey="value" fill="hsl(var(--status-in-progress))" radius={[0, 4, 4, 0]} maxBarSize={40}>
            <LabelList dataKey="value" position="right" style={labelStyle} />
          </Bar>
        </BarChart>
      </ChartCard>
    </div>
  );
}
