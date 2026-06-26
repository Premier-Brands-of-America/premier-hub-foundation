import { useState, useEffect, useMemo } from "react";
import { DiagnosticsRow, fetchDiagnosticsData } from "@/services/adminService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { Search, ArrowUpDown, Loader2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

type SortKey = "full_name" | "active_owned" | "active_assigned" | "total_active" | "completed";
type SortDir = "asc" | "desc";

function initials(name: string, email: string) {
  const src = (name || email || "").trim();
  if (!src) return "?";
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "").concat(parts[1]?.[0] ?? "").toUpperCase() || src[0].toUpperCase();
}

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
      className="-mr-2 ml-auto h-auto p-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:bg-transparent hover:text-foreground"
      onClick={() => toggleSort(field)}
    >
      {label}
      <ArrowUpDown className={`ml-1 h-3 w-3 ${sortKey === field ? "text-foreground" : "opacity-50"}`} />
    </Button>
  );

  const colCount = includeCompleted ? 5 : 4;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative w-full max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search employees"
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
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
          <span className="ml-2 text-sm">Loading diagnostics…</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
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
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--entity-person)/0.14)] text-xs font-semibold text-[hsl(var(--entity-person))]"
                        aria-hidden="true"
                      >
                        {initials(row.full_name || "", row.email || "")}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{row.full_name || row.email || "Unknown"}</p>
                        {row.department && <p className="truncate text-xs text-muted-foreground">{row.department}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{row.active_owned}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{row.active_assigned}</TableCell>
                  <TableCell className="text-right">
                    <span className="stat-numeral text-base">{row.total_active}</span>
                  </TableCell>
                  {includeCompleted && (
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{row.completed}</TableCell>
                  )}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={colCount} className="p-0">
                    <EmptyState
                      icon={<BarChart3 className="h-6 w-6" />}
                      title="No diagnostics to show"
                      description={search ? "Try a different search term." : "Adjust the filters above to see resource data."}
                    />
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
