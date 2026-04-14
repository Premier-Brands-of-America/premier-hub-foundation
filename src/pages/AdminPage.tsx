import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Settings, Users, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeTable } from "@/components/admin/EmployeeTable";
import { DiagnosticsTable } from "@/components/admin/DiagnosticsTable";
import { fetchAllProfiles, EmployeeProfile } from "@/services/adminService";

const AdminPage = () => {
  const { profile, user } = useAuth();
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await fetchAllProfiles();
      setEmployees(data);
    } catch (err) {
      console.error("Failed to load employees", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.is_admin) loadEmployees();
  }, [profile?.is_admin]);

  if (!profile?.is_admin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Admin Tools</h1>
          <p className="text-xs text-muted-foreground">Manage employee access, permissions, and view diagnostics</p>
        </div>
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees" className="gap-2">
            <Users className="h-3.5 w-3.5" />
            Employee Access
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="gap-2">
            <BarChart3 className="h-3.5 w-3.5" />
            Resource Diagnostics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <EmployeeTable
              employees={employees}
              onRefresh={loadEmployees}
              currentUserId={user?.id || ""}
            />
          )}
        </TabsContent>

        <TabsContent value="diagnostics">
          <DiagnosticsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
