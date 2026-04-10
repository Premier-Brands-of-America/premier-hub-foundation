import { useState, useEffect, useMemo } from "react";
import { DiagnosticsRow, fetchDiagnosticsData } from "@/services/adminService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type SortKey = "full_name" | "active_owned" | "active_assigned" | "total_active" | "completed";
type SortDir = "asc" | "desc";

export function DiagnosticsTable() {
  const [rows, setRows] = useState<DiagnosticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [publicOnly, setPublicOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("total_active");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchDiagnosticsData({ includeCompleted, publicOnly });
      setRows(data);
    } catch (err) {
      console.error("Failed to load diagnostics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [includeCompleted, publicOnly]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = rows;
    if (q) {
      list = list.filter(
        (r) =>
          (r.full_name || "").toLowerCase().includes(q) ||
          (r.email || "").toLowerCase().includes(q) ||
          (r.department || "").toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      const aVal = a[sortKey] ?? "";
      const bVal = b[sortKey] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return list;
  }, [rows, search, sortKey, sortDir]);

  const SortButton = ({ label, field }: { label: string; field: SortKey }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium text-xs hover:bg-transparent"
      onClick={() => toggleSort(field)}
    >
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="include-completed" checked={includeCompleted} onCheckedChange={setIncludeCompleted} />
          <Label htmlFor="include-completed" className="text-xs">Include completed</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="public-only" checked={publicOnly} onCheckedChange={setPublicOnly} />
          <Label htmlFor="public-only" className="text-xs">Public only</Label>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortButton label="Employee" field="full_name" /></TableHead>
                <TableHead className="text-right"><SortButton label="Active Owned" field="active_owned" /></TableHead>
                <TableHead className="text-right"><SortButton label="Active Assigned" field="active_assigned" /></TableHead>
                <TableHead className="text-right"><SortButton label="Total Active" field="total_active" /></TableHead>
                {includeCompleted && (
                  <TableHead className="text-right"><SortButton label="Completed" field="completed" /></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.user_id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm text-foreground">{row.full_name || row.email || "Unknown"}</p>
                      {row.department && <p className="text-xs text-muted-foreground">{row.department}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{row.active_owned}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{row.active_assigned}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">{row.total_active}</TableCell>
                  {includeCompleted && (
                    <TableCell className="text-right font-mono text-sm">{row.completed}</TableCell>
                  )}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={includeCompleted ? 5 : 4} className="text-center py-8 text-muted-foreground">
                    No data found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
