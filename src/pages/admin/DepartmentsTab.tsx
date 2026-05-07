import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAllDepartments, departmentKeys, type DepartmentRow } from "@/hooks/useDepartments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

interface EditState {
  open: boolean;
  row?: DepartmentRow;
}

export default function DepartmentsTab() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useAllDepartments();
  const [edit, setEdit] = useState<EditState>({ open: false });
  const [deactivateRow, setDeactivateRow] = useState<DepartmentRow | null>(null);
  const [deactivateInfo, setDeactivateInfo] = useState<{ count: number } | null>(null);

  const nextOrder = useMemo(() => {
    const max = rows.reduce((m, r) => Math.max(m, r.display_order ?? 0), 0);
    return max + 10;
  }, [rows]);

  const upsertMutation = useMutation({
    mutationFn: async (payload: { id?: string; name: string; is_active: boolean; display_order: number | null }) => {
      if (payload.id) {
        const { error } = await supabase
          .from("departments")
          .update({ name: payload.name, is_active: payload.is_active, display_order: payload.display_order })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("departments")
          .insert({ name: payload.name, is_active: payload.is_active, display_order: payload.display_order });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: departmentKeys.all });
      qc.invalidateQueries({ queryKey: departmentKeys.active });
      toast.success("Department saved");
      setEdit({ open: false });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("departments").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: departmentKeys.all });
      qc.invalidateQueries({ queryKey: departmentKeys.active });
      toast.success(vars.is_active ? "Department reactivated" : "Department deactivated");
      setDeactivateRow(null);
      setDeactivateInfo(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onAttemptDeactivate = async (row: DepartmentRow) => {
    // Guardrail: count active (non-archived) requests
    const { count, error } = await supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("department_id", row.id)
      .is("archived_at", null);
    if (error) {
      toast.error(error.message);
      return;
    }
    if ((count ?? 0) > 0) {
      toast.error(`${count} active request${count === 1 ? "" : "s"} use this department. Reassign or archive first.`);
      return;
    }
    setDeactivateRow(row);
    setDeactivateInfo({ count: count ?? 0 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage the department list. Hard delete is blocked — use Deactivate to preserve referential integrity.
        </p>
        <Button size="sm" onClick={() => setEdit({ open: true, row: undefined })}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Department
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-6 text-sm text-muted-foreground">Loading...</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-6 text-sm text-muted-foreground">No departments.</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell>
                  <Badge variant={r.is_active ? "default" : "secondary"}>
                    {r.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.display_order ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.updated_at ? format(new Date(r.updated_at), "PP p") : "—"}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => setEdit({ open: true, row: r })}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  {r.is_active ? (
                    <Button size="sm" variant="outline" onClick={() => onAttemptDeactivate(r)}>
                      Deactivate
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setActiveMutation.mutate({ id: r.id, is_active: true })}>
                      Reactivate
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* Hard delete blocked — use Deactivate. FK integrity. */}

      <EditDialog
        state={edit}
        onClose={() => setEdit({ open: false })}
        onSave={(p) => upsertMutation.mutate(p)}
        saving={upsertMutation.isPending}
        nextOrder={nextOrder}
      />

      <AlertDialog open={!!deactivateRow} onOpenChange={(o) => !o && setDeactivateRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate "{deactivateRow?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivating "{deactivateRow?.name}" hides it from new selections. Existing profiles and requests keep the reference. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deactivateRow && setActiveMutation.mutate({ id: deactivateRow.id, is_active: false })}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditDialog({
  state, onClose, onSave, saving, nextOrder,
}: {
  state: EditState;
  onClose: () => void;
  onSave: (p: { id?: string; name: string; is_active: boolean; display_order: number | null }) => void;
  saving: boolean;
  nextOrder: number;
}) {
  const isNew = !state.row;
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [order, setOrder] = useState<string>("");

  useMemo(() => {
    if (state.open) {
      setName(state.row?.name ?? "");
      setActive(state.row?.is_active ?? true);
      setOrder(state.row?.display_order != null ? String(state.row.display_order) : "");
    }
  }, [state.open, state.row]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required");
      return;
    }
    const ord = order.trim() === "" ? nextOrder : Number(order);
    if (Number.isNaN(ord)) {
      toast.error("Order must be a number");
      return;
    }
    onSave({ id: state.row?.id, name: trimmed, is_active: active, display_order: ord });
  };

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? "Add Department" : "Edit Department"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dept-name">Name <span className="text-destructive">*</span></Label>
            <Input id="dept-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="dept-active">Active</Label>
            <Switch id="dept-active" checked={active} onCheckedChange={setActive} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept-order">Display Order</Label>
            <Input
              id="dept-order"
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              placeholder={`Auto: ${nextOrder}`}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}