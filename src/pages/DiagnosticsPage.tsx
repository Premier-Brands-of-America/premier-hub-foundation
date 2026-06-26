import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { DiagnosticsTable } from "@/components/admin/DiagnosticsTable";

const DiagnosticsPage = () => {
  const { profile } = useAuth();

  if (!profile?.is_admin && !profile?.can_view_diagnostics) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resource Loading Diagnostics"
        subtitle="Project load distribution across employees"
      />

      {/* Header band — the one crimson edge-rail on this screen. */}
      <header className="edge-rail flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: "hsl(var(--primary) / 0.10)", color: "hsl(var(--primary))" }}
          aria-hidden="true"
        >
          <BarChart3 className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl">Resource Loading Diagnostics</h1>
            <Badge variant="outline" className="h-5 text-[10px]">Count-based</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Project load distribution across employees
          </p>
        </div>
      </header>

      <DiagnosticsTable />
    </div>
  );
};

export default DiagnosticsPage;
