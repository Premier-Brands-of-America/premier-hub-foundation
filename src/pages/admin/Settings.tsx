import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ALL_FEATURE_KEYS, FEATURE_DESCRIPTIONS, type FeatureKey } from "@/lib/featureKeys";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ChevronsUpDown, Check, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/PageHeader";
import DepartmentsTab from "@/pages/admin/DepartmentsTab";
import MemoryAccessTab from "@/pages/admin/MemoryAccessTab";

type EntityType = "global" | "department" | "user";
type FlagRow = {
  id: string;
  feature_key: string;
  entity_type: string;
  entity_id: string | null;
  enabled: boolean;
  updated_at: string;
  updated_by: string | null;
};

function useFlagRows() {
  return useQuery({
    queryKey: ["admin", "feature_flags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feature_flags").select("*");
      if (error) throw error;
      return (data ?? []) as FlagRow[];
    },
  });
}

function useDepartments() {
  return useQuery({
    queryKey: ["admin", "departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useProfilesList() {
  return useQuery({
    queryKey: ["admin", "profiles", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,user_id,full_name,email,department")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function findRow(rows: FlagRow[], key: FeatureKey, type: EntityType, entityId: string | null) {
  return rows.find(
    (r) =>
      r.feature_key === key &&
      r.entity_type === type &&
      (entityId === null ? r.entity_id === null : r.entity_id === entityId)
  );
}

function resolveEffective(
  rows: FlagRow[],
  key: FeatureKey,
  userId: string | null,
  deptId: string | null
): boolean {
  if (userId) {
    const u = findRow(rows, key, "user", userId);
    if (u) return u.enabled;
  }
  if (deptId) {
    const d = findRow(rows, key, "department", deptId);
    if (d) return d.enabled;
  }
  const g = findRow(rows, key, "global", null);
  return g ? g.enabled : true;
}

function ToggleMatrix({
  scope,
  entityId,
  parentResolve,
  rows,
  profileId,
  currentUserId,
}: {
  scope: EntityType;
  entityId: string | null;
  parentResolve?: (key: FeatureKey) => boolean;
  rows: FlagRow[];
  profileId: string | null;
  currentUserId: string | null;
}) {
  const qc = useQueryClient();
  const [confirmKey, setConfirmKey] = useState<FeatureKey | null>(null);

  const upsert = useMutation({
    mutationFn: async ({ key, enabled }: { key: FeatureKey; enabled: boolean }) => {
      const existing = findRow(rows, key, scope, entityId);
      const payload = {
        feature_key: key,
        entity_type: scope,
        entity_id: entityId,
        enabled,
        updated_by: profileId,
        updated_at: new Date().toISOString(),
      };
      if (existing) {
        const { error } = await supabase
          .from("feature_flags")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("feature_flags").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "feature_flags"] });
      qc.invalidateQueries({ queryKey: ["feature_flags"] });
      toast.success("Flag updated");
    },
    onError: (e: Error) => toast.error(e.message || "Something went wrong. Please try again."),
  });

  const reset = useMutation({
    mutationFn: async (key: FeatureKey) => {
      const existing = findRow(rows, key, scope, entityId);
      if (!existing) return;
      const { error } = await supabase.from("feature_flags").delete().eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "feature_flags"] });
      qc.invalidateQueries({ queryKey: ["feature_flags"] });
      toast.success("Reset");
    },
    onError: (e: Error) => toast.error(e.message || "Something went wrong. Please try again."),
  });

  const handleToggle = (key: FeatureKey, next: boolean) => {
    // Guardrails for admin_settings
    if (key === "admin_settings" && !next) {
      if (scope === "global") return;
      if (scope === "user" && entityId === currentUserId) return;
    }
    if (!next) {
      setConfirmKey(key);
    } else {
      upsert.mutate({ key, enabled: next });
    }
  };

  const confirmDisable = () => {
    if (confirmKey) upsert.mutate({ key: confirmKey, enabled: false });
    setConfirmKey(null);
  };

  return (
    <TooltipProvider>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature Key</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>{scope === "global" ? "Global" : "Override"}</TableHead>
              {scope !== "global" && <TableHead>Effective</TableHead>}
              <TableHead>Last Updated</TableHead>
              {scope !== "global" && <TableHead className="w-[140px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ALL_FEATURE_KEYS.map((key) => {
              const row = findRow(rows, key, scope, entityId);
              const checked = row?.enabled ?? (scope === "global" ? true : parentResolve?.(key) ?? true);
              const effective = parentResolve ? (row ? row.enabled : parentResolve(key)) : checked;
              const lockedAdmin =
                key === "admin_settings" &&
                ((scope === "global") || (scope === "user" && entityId === currentUserId));

              const switchEl = (
                <Switch
                  checked={checked}
                  disabled={lockedAdmin && checked}
                  onCheckedChange={(v) => handleToggle(key, v)}
                />
              );

              return (
                <TableRow key={key}>
                  <TableCell className="font-mono text-xs">{key}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {FEATURE_DESCRIPTIONS[key]}
                  </TableCell>
                  <TableCell>
                    {lockedAdmin ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block">{switchEl}</span>
                        </TooltipTrigger>
                        <TooltipContent>Cannot disable for current admin</TooltipContent>
                      </Tooltip>
                    ) : (
                      switchEl
                    )}
                    {scope !== "global" && !row && (
                      <span className="ml-2 text-xs text-muted-foreground">(inherited)</span>
                    )}
                  </TableCell>
                  {scope !== "global" && (
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full border-transparent px-2.5",
                          effective
                            ? "bg-[hsl(var(--status-done)/0.14)] text-[hsl(var(--status-done))]"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {effective ? "On" : "Off"}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-xs text-muted-foreground">
                    {row?.updated_at ? format(new Date(row.updated_at), "PP p") : "—"}
                  </TableCell>
                  {scope !== "global" && (
                    <TableCell>
                      {row && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => reset.mutate(key)}
                        >
                          Reset to {scope === "user" ? "Department" : "Global"}
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!confirmKey} onOpenChange={(o) => !o && setConfirmKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable feature?</AlertDialogTitle>
            <AlertDialogDescription>
              Turning off <span className="font-mono">{confirmKey}</span> may hide functionality
              for affected users immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisable}>Disable</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

function FeaturesTab() {
  const { profile, user } = useAuth();
  const [view, setView] = useState<EntityType>("global");
  const { data: rows = [] } = useFlagRows();
  const { data: departments = [] } = useDepartments();
  const { data: profiles = [] } = useProfilesList();
  const [deptId, setDeptId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userPickerOpen, setUserPickerOpen] = useState(false);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.user_id === userId) ?? null,
    [profiles, userId]
  );
  const selectedProfileDept = useMemo(() => {
    if (!selectedProfile) return null;
    const match = departments.find((d) => d.name === selectedProfile.department);
    return match?.id ?? null;
  }, [selectedProfile, departments]);

  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={(v) => setView(v as EntityType)}>
        <TabsList>
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="department">By Department</TabsTrigger>
          <TabsTrigger value="user">By User</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-4">
          <ToggleMatrix
            scope="global"
            entityId={null}
            rows={rows}
            profileId={profile?.id ?? null}
            currentUserId={user?.id ?? null}
          />
        </TabsContent>

        <TabsContent value="department" className="mt-4 space-y-4">
          <div className="max-w-sm">
            <Select value={deptId ?? ""} onValueChange={(v) => setDeptId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {deptId && (
            <ToggleMatrix
              scope="department"
              entityId={deptId}
              rows={rows}
              profileId={profile?.id ?? null}
              currentUserId={user?.id ?? null}
              parentResolve={(k) => resolveEffective(rows, k, null, null)}
            />
          )}
        </TabsContent>

        <TabsContent value="user" className="mt-4 space-y-4">
          <div className="max-w-md">
            <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {selectedProfile
                    ? `${selectedProfile.full_name ?? selectedProfile.email} — ${selectedProfile.department ?? "—"}`
                    : "Select a user"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search by name, email, dept..." />
                  <CommandList>
                    <CommandEmpty>No users.</CommandEmpty>
                    <CommandGroup>
                      {profiles.map((p) => (
                        <CommandItem
                          key={p.user_id}
                          value={`${p.full_name ?? ""} ${p.email ?? ""} ${p.department ?? ""}`}
                          onSelect={() => {
                            setUserId(p.user_id);
                            setUserPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              userId === p.user_id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm">{p.full_name ?? p.email}</span>
                            <span className="text-xs text-muted-foreground">
                              {p.email} · {p.department ?? "—"}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          {userId && (
            <ToggleMatrix
              scope="user"
              entityId={userId}
              rows={rows}
              profileId={profile?.id ?? null}
              currentUserId={user?.id ?? null}
              parentResolve={(k) => resolveEffective(rows, k, null, selectedProfileDept)}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab() {
  const { data: profiles = [] } = useProfilesList();
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-center">Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((p: any) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium text-foreground">{p.full_name ?? "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{p.department ?? "—"}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="rounded-full border-transparent bg-[hsl(var(--status-info)/0.14)] px-2.5 capitalize text-[hsl(var(--status-info))]"
                >
                  requester
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Switch checked disabled aria-label="Active" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        Role and active editing coming soon.
      </p>
    </div>
  );
}

// DepartmentsTab moved to ./DepartmentsTab.tsx

function AuditLogTab() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-border py-12">
      <EmptyState
        icon={<ScrollText className="h-6 w-6" />}
        title="Audit log lives on its own page"
        description="The app-wide, searchable record of admin and system changes is available in Administration → Audit Log."
      />
      <a
        href="/audit"
        className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Open Audit Log
      </a>
    </div>
  );
}

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <PageHeader title="Admin Settings" subtitle="Feature flags, users, and departments" />

      <header className="edge-rail">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage feature flags, users, and departments.
        </p>
      </header>

      <Tabs defaultValue="features">
        <TabsList>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="memory">Memory access</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>
        <TabsContent value="features" className="mt-4">
          <FeaturesTab />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersTab />
        </TabsContent>
        <TabsContent value="departments" className="mt-4">
          <DepartmentsTab />
        </TabsContent>
        <TabsContent value="memory" className="mt-4">
          <MemoryAccessTab />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <AuditLogTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
