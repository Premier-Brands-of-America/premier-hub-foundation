import { useEffect, useState } from "react";
import { BarChart3, Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useReportData } from "@/hooks/useReportData";
import {
  ALL_REPORT_CHARTS,
  DEFAULT_REPORT_CHARTS,
  REPORT_CHART_META,
  getReportCharts,
  setReportCharts,
  type ReportChartId,
} from "@/lib/reportPrefs";
import { ReportChart } from "@/features/reports/ReportCharts";

export default function Reports() {
  const { profile } = useAuth();
  const userId = profile?.user_id;
  const { items, isLoading } = useReportData();

  const [charts, setCharts] = useState<ReportChartId[]>(() => getReportCharts(userId));

  // Re-sync the saved selection once auth resolves (userId is undefined on the
  // first render in preview, so the lazy seed above falls back to defaults).
  useEffect(() => {
    setCharts(getReportCharts(userId));
  }, [userId]);

  const toggle = (id: ReportChartId) => {
    const next = charts.includes(id)
      ? charts.filter((c) => c !== id)
      : [...charts, id];
    setCharts(next);
    setReportCharts(userId, next);
  };

  const reset = () => {
    setCharts(DEFAULT_REPORT_CHARTS);
    setReportCharts(userId, DEFAULT_REPORT_CHARTS);
  };

  const visible = ALL_REPORT_CHARTS.filter((id) => charts.includes(id));

  const customize = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="h-4 w-4" />
          Customize
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Charts</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ALL_REPORT_CHARTS.map((id) => (
          <DropdownMenuCheckboxItem
            key={id}
            checked={charts.includes(id)}
            onCheckedChange={() => toggle(id)}
            onSelect={(e) => e.preventDefault()}
          >
            {REPORT_CHART_META[id].title}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={reset}>Reset to default</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-3 sm:p-4 md:p-6">
      <PageHeader
        title="Reports"
        subtitle="Throughput, turnaround, and request trends"
        actions={customize}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="No charts selected"
          description="Use the Customize menu to add charts to your dashboard."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((id) => (
            <ReportChart key={id} id={id} items={items} />
          ))}
        </div>
      )}
    </div>
  );
}
