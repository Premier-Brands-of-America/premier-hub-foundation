import { ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/PageHeader";

export default function Queue() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-3 sm:p-4 md:p-6">
      <PageHeader title="Queue" subtitle="Incoming art requests to triage and assign" />

      <header className="edge-rail">
        <h1 className="text-2xl font-semibold tracking-tight">Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Incoming art requests ready to triage, prioritize, and assign.
        </p>
      </header>

      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={<ListChecks className="h-6 w-6" />}
            title="The queue is coming soon"
            description="Submitted requests awaiting assignment will be listed here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
