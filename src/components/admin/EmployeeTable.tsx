import { useState } from "react";
import { EmployeeProfile, updateProfileFlag } from "@/services/adminService";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search } from "lucide-react";

interface EmployeeTableProps {
  employees: EmployeeProfile[];
  onRefresh: () => void;
  currentUserId: string;
}

export function EmployeeTable({ employees, onRefresh, currentUserId }: EmployeeTableProps) {
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (e.full_name || "").toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q) ||
      (e.department || "").toLowerCase().includes(q) ||
      (e.title || "").toLowerCase().includes(q)
    );
  });

  const handleToggle = async (userId: string, flag: "is_admin" | "can_view_diagnostics" | "is_active", value: boolean) => {
    if (userId === currentUserId && flag === "is_admin" && !value) {
      toast.error("You cannot remove your own admin access.");
      return;
    }
    setUpdating(`${userId}-${flag}`);
    try {
      await updateProfileFlag(userId, flag, value);
      toast.success("Updated successfully");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border border-border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-center">Active</TableHead>
              <TableHead className="text-center">Admin</TableHead>
              <TableHead className="text-center">Diagnostics</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((emp) => (
              <TableRow key={emp.user_id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm text-foreground">
                      {emp.full_name || emp.email || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                    {emp.title && (
                      <p className="text-xs text-muted-foreground">{emp.title}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">{emp.department || "—"}</span>
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={emp.is_active}
                    disabled={updating === `${emp.user_id}-is_active` || emp.user_id === currentUserId}
                    onCheckedChange={(v) => handleToggle(emp.user_id, "is_active", v)}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={emp.is_admin}
                    disabled={updating === `${emp.user_id}-is_admin` || emp.user_id === currentUserId}
                    onCheckedChange={(v) => handleToggle(emp.user_id, "is_admin", v)}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={emp.can_view_diagnostics}
                    disabled={updating === `${emp.user_id}-can_view_diagnostics`}
                    onCheckedChange={(v) => handleToggle(emp.user_id, "can_view_diagnostics", v)}
                  />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No employees found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
