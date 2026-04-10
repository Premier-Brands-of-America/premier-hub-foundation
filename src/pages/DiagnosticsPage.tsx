import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DiagnosticsTable } from "@/components/admin/DiagnosticsTable";

const DiagnosticsPage = () => {
  const { profile } = useAuth();

  if (!profile?.is_admin && !profile?.can_view_diagnostics) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-accent" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">Resource Loading Diagnostics</h1>
            <Badge variant="outline" className="text-[10px] h-5">Count-based</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Project load distribution across employees
          </p>
        </div>
      </div>

      <DiagnosticsTable />
    </div>
  );
};

export default DiagnosticsPage;
