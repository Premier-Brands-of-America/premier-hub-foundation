import { useState } from "react";
import { EmployeeProfile, updateProfileFlag } from "@/services/adminService";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Users } from "lucide-react";

interface EmployeeTableProps {
  employees: EmployeeProfile[];
  onRefresh: () => void;
  currentUserId: string;
}

function initials(name: string, email: string) {
  const src = (name || email || "").trim();
  if (!src) return "?";
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "").concat(parts[1]?.[0] ?? "").toUpperCase() || src[0].toUpperCase();
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search employees"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {filtered.length} of {employees.length} {employees.length === 1 ? "employee" : "employees"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
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
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--entity-person)/0.14)] text-xs font-semibold text-[hsl(var(--entity-person))]"
                      aria-hidden="true"
                    >
                      {initials(emp.full_name || "", emp.email || "")}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {emp.full_name || emp.email || "Unknown"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {emp.email}
                        {emp.title ? ` · ${emp.title}` : ""}
                      </p>
                    </div>
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
                    aria-label={`Toggle active for ${emp.full_name || emp.email}`}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={emp.is_admin}
                    disabled={updating === `${emp.user_id}-is_admin` || emp.user_id === currentUserId}
                    onCheckedChange={(v) => handleToggle(emp.user_id, "is_admin", v)}
                    aria-label={`Toggle admin for ${emp.full_name || emp.email}`}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={emp.can_view_diagnostics}
                    disabled={updating === `${emp.user_id}-can_view_diagnostics`}
                    onCheckedChange={(v) => handleToggle(emp.user_id, "can_view_diagnostics", v)}
                    aria-label={`Toggle diagnostics access for ${emp.full_name || emp.email}`}
                  />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <EmptyState
                    icon={<Users className="h-6 w-6" />}
                    title="No employees found"
                    description={search ? "Try a different search term." : "No employee profiles are available yet."}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
