import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, FileText } from "lucide-react";

export default function SubmitRequest() {
  const navigate = useNavigate();
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">New Art Request</h1>
        <p className="text-sm text-muted-foreground">Choose the type of request that fits your scope.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle>Easy Request</CardTitle>
            </div>
            <CardDescription>
              Comps, mockups, small art changes, renders, quick updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto space-y-4">
            <p className="text-sm text-muted-foreground">~6 quick fields. Use when scope is clear.</p>
            <Button className="w-full" onClick={() => navigate("/requests/new/easy")}>
              Start Easy Request
            </Button>
          </CardContent>
        </Card>
        <Card className="flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Full Brief</CardTitle>
            </div>
            <CardDescription>
              Complex projects requiring brand direction, references, claims, approvals.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto space-y-4">
            <p className="text-sm text-muted-foreground">Full brief intake. Use when scope needs detail.</p>
            <Button className="w-full" variant="secondary" onClick={() => navigate("/requests/new/full-brief")}>
              Start Full Brief
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
