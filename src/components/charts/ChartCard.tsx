/**
 * Shared chart card — the titled Card wrapper used by the Reports dashboard and
 * the Workload view. Extracted from ReportCharts so both import one implementation
 * (ReportCharts keeps a thin re-export to avoid churn).
 *
 * Two modes:
 *  - Default (Reports): fixed `h-64` body wrapping children in a ResponsiveContainer
 *    (children is a single recharts element). Preserves the original behavior.
 *  - `bare` (Workload hero): renders children directly (the caller owns its own
 *    ResponsiveContainer + height), for variable-height charts.
 */
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  description,
  isEmpty,
  emptyLabel = "No data yet",
  bare = false,
  bodyClassName,
  hint,
  children,
}: {
  title: string;
  description?: string;
  isEmpty?: boolean;
  emptyLabel?: string;
  /** Render children directly (caller owns ResponsiveContainer + height). */
  bare?: boolean;
  bodyClassName?: string;
  /** Optional "?" contextual-help tooltip shown next to the title. */
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          {title}
          {hint}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className={cn(!bare && "h-64", bodyClassName)}>
        {isEmpty ? (
          <div className="flex h-full min-h-[8rem] items-center justify-center text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : bare ? (
          (children as React.ReactElement)
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
