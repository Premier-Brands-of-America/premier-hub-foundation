import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/PageHeader";

export default function Reports() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-3 sm:p-4 md:p-6">
      <PageHeader title="Reports" subtitle="Throughput, turnaround, and request trends" />

      <header className="edge-rail">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Throughput, turnaround time, and request volume over time.
        </p>
      </header>

      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" />}
            title="Reports are coming soon"
            description="Charts on request volume and turnaround will live here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
