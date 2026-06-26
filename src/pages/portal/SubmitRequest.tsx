import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Zap, FileText, ArrowRight } from "lucide-react";

export default function SubmitRequest() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-3 sm:p-4 md:p-6">
      <PageHeader
        title="New Art Request"
        subtitle="Choose the type of request that fits your scope"
      />

      <header className="edge-rail">
        <h1 className="text-2xl font-semibold tracking-tight">New Art Request</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Two intake paths. Pick the one that matches how defined your project is.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="group flex flex-col transition-colors hover:border-primary/40">
          <CardHeader className="space-y-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.10)] text-primary"
              aria-hidden
            >
              <Zap className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <CardTitle className="text-base">Easy Request</CardTitle>
              <CardDescription>
                Comps, mockups, small art changes, renders, quick updates.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="mt-auto space-y-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium">3 steps</span>
              <span>~6 quick fields · use when scope is clear</span>
            </div>
            <Button className="w-full gap-2" onClick={() => navigate("/requests/new/easy")}>
              Start Easy Request
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </CardContent>
        </Card>

        <Card className="group flex flex-col transition-colors hover:border-primary/40">
          <CardHeader className="space-y-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--entity-request)/0.12)] text-[hsl(var(--entity-request))]"
              aria-hidden
            >
              <FileText className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <CardTitle className="text-base">Full Brief</CardTitle>
              <CardDescription>
                Complex projects requiring brand direction, references, claims, approvals.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="mt-auto space-y-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium">6 steps</span>
              <span>full brief intake · use when scope needs detail</span>
            </div>
            <Button
              className="w-full gap-2"
              variant="secondary"
              onClick={() => navigate("/requests/new/full-brief")}
            >
              Start Full Brief
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
