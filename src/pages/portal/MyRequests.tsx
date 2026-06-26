import { Link } from "react-router-dom";
import { Inbox, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/PageHeader";

export default function MyRequests() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-3 sm:p-4 md:p-6">
      <PageHeader
        title="My Requests"
        subtitle="Track the art requests you've submitted"
        actions={
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/requests/new">
              <Plus className="h-3.5 w-3.5" /> New request
            </Link>
          </Button>
        }
      />

      <header className="edge-rail">
        <h1 className="text-2xl font-semibold tracking-tight">My Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track the art requests you've submitted and their status.
        </p>
      </header>

      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title="Your requests will appear here"
            description="This view is coming soon. In the meantime, start a new art request."
            action={
              <Button asChild size="sm" className="gap-1.5">
                <Link to="/requests/new">
                  <Plus className="h-3.5 w-3.5" /> New request
                </Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
