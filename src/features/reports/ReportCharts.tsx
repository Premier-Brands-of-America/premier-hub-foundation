/**
 * Reports dashboard charts — renders a single predefined chart by id, reusing
 * the planner chart idioms (tooltip/legend/axis styles, color arrays, ChartCard
 * wrapper, donutCenter). Each chart maps a reportsMetrics fn -> recharts shape.
 */
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
import { ChartCard } from "@/components/charts/ChartCard";
import { GlossaryHint } from "@/lib/glossary";
import {
  statusBreakdown,
  byDepartment,
  workload,
  dueHealth,
  priorityMix,
  throughput,
  type CountDatum,
} from "@/lib/reportsMetrics";
import { REPORT_CHART_META, type ReportChartId } from "@/lib/reportPrefs";
import type { ReportItem } from "@/lib/reportsMetrics";

/** Status order: Not started, In progress, In review, Completed.
    Data never wears the brand accent — in-progress is azure, review amber. */
const STATUS_COLORS = [
  "hsl(var(--muted-foreground))",
  "hsl(var(--status-in-progress))",
  "hsl(var(--warning))",
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

// ChartCard now lives in @/components/charts/ChartCard (shared with Workload);
// re-exported here so existing imports of it from this module keep working.
export { ChartCard };

/** Centered big-number total drawn in the donut hole. */
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

// Returns the PieChart element (NOT a component) so ResponsiveContainer clones
// the chart directly and injects width/height — wrapping it in a component would
// leave the PieChart unsized and render blank.
function renderDonut(data: CountDatum[], colors: string[]) {
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
        <Label position="center" content={donutCenter(sum(data))} />
      </Pie>
      <Tooltip contentStyle={tooltipStyle} />
      {/* Legend shows the COUNT next to each segment — donuts that hide their
          numbers force the reader to guess arc lengths (audit finding). */}
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

/** Renders one chart by id. Returns null for an unknown id (defensive). */
export function ReportChart({ id, items }: { id: ReportChartId; items: ReportItem[] }) {
  const meta = REPORT_CHART_META[id];

  switch (id) {
    case "status": {
      const data = statusBreakdown(items);
      return (
        <ChartCard title={meta.title} description={meta.description} isEmpty={sum(data) === 0}>
          {renderDonut(data, STATUS_COLORS)}
        </ChartCard>
      );
    }

    case "due_health": {
      const data = dueHealth(items);
      return (
        <ChartCard title={meta.title} description={meta.description} isEmpty={sum(data) === 0} hint={<GlossaryHint term="dueHealth" />}>
          {renderDonut(data, HEALTH_COLORS)}
        </ChartCard>
      );
    }

    case "by_department": {
      const data = byDepartment(items);
      return (
        <ChartCard title={meta.title} description={meta.description} isEmpty={data.length === 0}>
          <BarChart data={data} margin={{ top: 16, right: 12, bottom: 4, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} width={32} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} />
            <Bar dataKey="value" fill="hsl(var(--status-in-progress))" radius={[4, 4, 0, 0]} maxBarSize={40}>
              <LabelList dataKey="value" position="top" style={labelStyle} />
            </Bar>
          </BarChart>
        </ChartCard>
      );
    }

    case "workload": {
      const data = workload(items);
      return (
        <ChartCard title={meta.title} description={meta.description} isEmpty={data.length === 0}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} />
            <YAxis type="category" dataKey="name" width={90} axisLine={false} tickLine={false} tick={axisTick} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} />
            <Bar dataKey="value" fill="hsl(var(--status-in-progress))" radius={[0, 4, 4, 0]} maxBarSize={40}>
              <LabelList dataKey="value" position="right" style={labelStyle} />
            </Bar>
          </BarChart>
        </ChartCard>
      );
    }

    case "throughput": {
      const data = throughput(items);
      return (
        <ChartCard title={meta.title} description={meta.description} isEmpty={sum(data) === 0} hint={<GlossaryHint term="intake" />}>
          <LineChart data={data} margin={{ top: 16, right: 16, bottom: 4, left: -8 }}>
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
      );
    }

    case "priority": {
      const data = priorityMix(items);
      return (
        <ChartCard title={meta.title} description={meta.description} isEmpty={sum(data) === 0}>
          <BarChart data={data} margin={{ top: 16, right: 12, bottom: 4, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} width={32} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((_, i) => (
                <Cell key={i} fill={PRIORITY_COLORS[i % PRIORITY_COLORS.length]} />
              ))}
              <LabelList dataKey="value" position="top" style={labelStyle} />
            </Bar>
          </BarChart>
        </ChartCard>
      );
    }

    default:
      return null;
  }
}
