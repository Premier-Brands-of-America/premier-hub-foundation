/**
 * Planner-style dashboard charts — live, data-driven summaries of the board.
 * Status breakdown, by bucket, by priority, by assignee, and due-date health.
 */
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  statusBreakdown,
  byBucket,
  byPriority,
  byAssignee,
  dueHealth,
} from "./plannerMetrics";
import type { Board } from "./types";

const STATUS_COLORS = ["hsl(var(--muted-foreground))", "hsl(var(--primary))", "hsl(142 70% 42%)"];
const HEALTH_COLORS = [
  "hsl(var(--destructive))",
  "hsl(38 92% 50%)",
  "hsl(142 70% 42%)",
  "hsl(var(--muted-foreground))",
];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
};

export function PlannerCharts({ board }: { board: Board }) {
  const status = statusBreakdown(board);
  const buckets = byBucket(board);
  const priority = byPriority(board);
  const assignees = byAssignee(board);
  const health = dueHealth(board);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <ChartCard title="Status breakdown">
        <PieChart>
          <Pie data={status} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
            {status.map((_, i) => (
              <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ChartCard>

      <ChartCard title="Due-date health">
        <PieChart>
          <Pie data={health} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
            {health.map((_, i) => (
              <Cell key={i} fill={HEALTH_COLORS[i % HEALTH_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ChartCard>

      <ChartCard title="By bucket">
        <BarChart data={buckets}>
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={24} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="By priority">
        <BarChart data={priority}>
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={24} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="By assignee / lead">
        <BarChart data={assignees} layout="vertical">
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartCard>
    </div>
  );
}
