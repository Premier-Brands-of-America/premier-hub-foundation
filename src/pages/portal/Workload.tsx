import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/PageHeader";

export default function Workload() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-3 sm:p-4 md:p-6">
      <PageHeader title="Workload" subtitle="Capacity and assignment across the team" />

      <header className="edge-rail">
        <h1 className="text-2xl font-semibold tracking-tight">Workload</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          See how active requests are distributed across designers.
        </p>
      </header>

      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Workload view is coming soon"
            description="Per-designer capacity and assignment balance will appear here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
