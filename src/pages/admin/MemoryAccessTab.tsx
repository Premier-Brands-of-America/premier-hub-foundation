import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { Brain, Trash2, Globe, User as UserIcon, Building2 } from "lucide-react";
import {
  listMemoryGrants, addMemoryGrant, removeMemoryGrant, type MemoryGrant,
} from "@/services/memoryService";

interface Person { user_id: string; full_name: string | null; email: string | null }
interface Dept { id: string; name: string }

function usePeople() {
  return useQuery({
    queryKey: ["memory-access", "people"],
    queryFn: async (): Promise<Person[]> => {
      if (isPreviewEnvironment()) return [];
      const { data } = await supabase.from("profiles")
        .select("user_id, full_name, email").eq("is_active", true).order("full_name");
      return (data ?? []) as Person[];
    },
  });
}
function useDepts() {
  return useQuery({
    queryKey: ["memory-access", "departments"],
    queryFn: async (): Promise<Dept[]> => {
      if (isPreviewEnvironment()) return [];
      const { data } = await supabase.from("departments").select("id, name").order("name");
      return (data ?? []) as Dept[];
    },
  });
}

/**
 * Admin section to grant view access to the memory knowledge graph — by user,
 * by department, or to everyone. Writes to memory_access_grants; can_view_memory
 * consults these grants on top of the admin bypass.
 */
export default function MemoryAccessTab() {
  const qc = useQueryClient();
  const grants = useQuery({ queryKey: ["memory-access", "grants"], queryFn: listMemoryGrants });
  const people = usePeople();
  const depts = useDepts();
  const [userId, setUserId] = useState<string>("");
  const [deptId, setDeptId] = useState<string>("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["memory-access", "grants"] });

  const add = useMutation({
    mutationFn: (g: Parameters<typeof addMemoryGrant>[0]) => addMemoryGrant(g),
    onSuccess: () => { invalidate(); toast.success("Access granted"); },
    onError: (e) => toast.error("Could not grant access", { description: e instanceof Error ? e.message : String(e) }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeMemoryGrant(id),
    onSuccess: () => { invalidate(); toast.success("Grant removed"); },
    onError: (e) => toast.error("Could not remove grant", { description: e instanceof Error ? e.message : String(e) }),
  });

  const everyoneGrant = (grants.data ?? []).find((g) => g.everyone);
  const nameFor = (g: MemoryGrant): { icon: typeof Globe; label: string } => {
    if (g.everyone) return { icon: Globe, label: "Everyone" };
    if (g.grantee_user_id) {
      const p = people.data?.find((x) => x.user_id === g.grantee_user_id);
      return { icon: UserIcon, label: p?.full_name || p?.email || "User" };
    }
    if (g.grantee_department_id) {
      const d = depts.data?.find((x) => x.id === g.grantee_department_id);
      return { icon: Building2, label: d?.name ? `${d.name} (department)` : "Department" };
    }
    return { icon: UserIcon, label: "Grant" };
  };

  if (isPreviewEnvironment()) {
    return (
      <EmptyState
        icon={<Brain className="h-6 w-6" />}
        title="Memory access (preview)"
        description="Grant management writes to memory_access_grants in production. In preview, access mirrors the admin flag."
      />
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" /> Memory access
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Admins always see the memory knowledge graph. Grant view access to others by user,
          department, or everyone. Every view is recorded in an append-only audit log.
        </p>
      </div>

      {/* Everyone toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Everyone</p>
            <p className="text-xs text-muted-foreground">Let every authenticated user open /memory</p>
          </div>
        </div>
        <Switch
          checked={!!everyoneGrant}
          onCheckedChange={(on) => {
            if (on) add.mutate({ everyone: true });
            else if (everyoneGrant) remove.mutate(everyoneGrant.id);
          }}
        />
      </div>

      {/* Grant by user */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground">Grant to a user</label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Select a person…" /></SelectTrigger>
            <SelectContent>
              {(people.data ?? []).map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          disabled={!userId || add.isPending}
          onClick={() => { add.mutate({ grantee_user_id: userId }); setUserId(""); }}
        >Grant</Button>
      </div>

      {/* Grant by department */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground">Grant to a department</label>
          <Select value={deptId} onValueChange={setDeptId}>
            <SelectTrigger><SelectValue placeholder="Select a department…" /></SelectTrigger>
            <SelectContent>
              {(depts.data ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          disabled={!deptId || add.isPending}
          onClick={() => { add.mutate({ grantee_department_id: deptId }); setDeptId(""); }}
        >Grant</Button>
      </div>

      {/* Active grants */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Active grants</p>
        {grants.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (grants.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No grants yet — only admins can see the memory graph.</p>
        ) : (
          <ul className="space-y-2">
            {(grants.data ?? []).map((g) => {
              const { icon: Icon, label } = nameFor(g);
              return (
                <li key={g.id} className="flex items-center gap-2 rounded-lg border border-border/50 p-2.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{label}</span>
                  {g.everyone && <Badge variant="secondary" className="text-[10px]">global</Badge>}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(g.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
