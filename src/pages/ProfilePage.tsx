import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Moon, Sun, Rows3, Rows4, Loader2, RefreshCw, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DepartmentPicker } from "@/components/forms/DepartmentPicker";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PageHeader } from "@/components/PageHeader";
import { EntityAvatar } from "@/components/common/EntityAvatar";
import { AvatarPicker } from "@/components/common/AvatarPicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDesignMode, type Theme, type Density } from "@/providers/DesignModeProvider";
import { AppearanceColors } from "@/components/AppearanceColors";
import { Microsoft365Connections } from "@/components/integrations/Microsoft365Connections";
import { fetchDirectory } from "@/lib/directory";
import { useOutlookConnection } from "@/components/integrations/outlook/hooks";

export default function ProfilePage() {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [departmentId, setDepartmentId] = useState<string>(profile?.department_id ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [syncingDir, setSyncingDir] = useState(false);
  const { theme, setTheme, density, setDensity } = useDesignMode();
  const { data: msConn } = useOutlookConnection();

  // Directory is environment-aware (demo people in preview, real profiles in prod).
  const { data: directory = [] } = useQuery({
    queryKey: ["directory"],
    queryFn: fetchDirectory,
  });

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setDepartmentId(profile?.department_id ?? "");
    setAvatarUrl((profile as { avatar_url?: string | null } | null)?.avatar_url ?? null);
  }, [profile?.id]);

  // Persist a chosen avatar (DiceBear default, preset, or uploaded data-URL)
  // immediately to profiles.avatar_url. (Production should swap the upload
  // data-URL for a Supabase Storage URL — see BLOCKERS.md.)
  const saveAvatar = async (uri: string) => {
    if (!profile) return;
    setAvatarUrl(uri); // optimistic
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: uri })
        .eq("user_id", profile.user_id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      qc.invalidateQueries({ queryKey: ["admin", "profiles", "list"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update avatar");
    }
  };

  const onSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, department_id: departmentId || null })
        .eq("user_id", profile.user_id);
      if (error) throw error;
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      qc.invalidateQueries({ queryKey: ["admin", "profiles", "list"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Sync the Microsoft 365 org directory (admin action). Invokes the
  // graph-user-directory edge fn, which backfills profiles.title/department/
  // office_location/manager_email + org_directory from Microsoft Graph.
  const syncDirectory = async () => {
    setSyncingDir(true);
    try {
      const { data, error } = await supabase.functions.invoke("graph-user-directory");
      if (error) throw error;
      const synced = (data as { synced?: number } | null)?.synced ?? 0;
      toast.success(`Synced ${synced} ${synced === 1 ? "person" : "people"} from Microsoft 365`);
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      qc.invalidateQueries({ queryKey: ["directory"] });
      qc.invalidateQueries({ queryKey: ["admin", "profiles", "list"] });
    } catch (e) {
      toast.error("Microsoft 365 directory sync failed", {
        description: e instanceof Error ? e.message : "Reconnect Microsoft 365 and try again.",
      });
    } finally {
      setSyncingDir(false);
    }
  };

  if (!profile) return null;

  const azureOid = (profile as { azure_oid?: string }).azure_oid ?? "";
  const role = profile.role ?? "requester";

  // Real org info from the profile (backfilled by graph-user-directory) + directory.
  const officeLocation = (profile as { office_location?: string | null }).office_location ?? null;
  const emailLc = (profile.email ?? "").toLowerCase();
  const manager = profile.manager_email
    ? directory.find((p) => (p.email ?? "").toLowerCase() === profile.manager_email!.toLowerCase())
    : undefined;
  const directReports = emailLc
    ? directory.filter(
        (p) => (p.manager_email ?? "").toLowerCase() === emailLc && (p.email ?? "").toLowerCase() !== emailLc,
      )
    : [];
  const hasOrgInfo = !!(profile.title || profile.department || officeLocation || profile.manager_email);
  const isAdmin = role === "admin";
  const connected = !!msConn;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="My Profile" subtitle="Account, identity, and appearance" />

      {/* Identity banner — the one bold thing on this screen */}
      <header className="edge-rail">
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="shrink-0 rounded-full transition-transform hover:-translate-y-0.5" aria-label="Change avatar">
                <EntityAvatar
                  type="user"
                  seed={profile.user_id}
                  name={fullName || profile.email || ""}
                  src={avatarUrl}
                  size="xl"
                  glow
                />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72">
              <AvatarPicker type="user" value={avatarUrl ?? ""} onChange={saveAvatar} />
            </PopoverContent>
          </Popover>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {fullName || profile.email || "My Profile"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="truncate">{profile.email}</span>
              <span aria-hidden="true">·</span>
              <Badge
                variant="outline"
                className="rounded-full border-transparent bg-[hsl(var(--status-info)/0.14)] px-2.5 capitalize text-[hsl(var(--status-info))]"
              >
                {role}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Editable details — primary positive action lives here */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile details</CardTitle>
          <p className="text-xs text-muted-foreground">Your name and department across the hub.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept">Department</Label>
            <DepartmentPicker id="dept" value={departmentId} onChange={setDepartmentId} />
          </div>
          <div className="flex justify-end border-t border-border pt-4">
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Read-only account facts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <p className="text-xs text-muted-foreground">Managed by your organization — read-only.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</dt>
              <dd className="truncate text-sm text-foreground">{profile.email || "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</dt>
              <dd className="text-sm capitalize text-foreground">{role}</dd>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Microsoft Object ID
              </dt>
              <dd className="truncate font-mono text-xs text-muted-foreground">{azureOid || "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Organization — real M365 directory info (title/department/manager/reports) */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Organization</CardTitle>
            <p className="text-xs text-muted-foreground">
              Your role in the org, synced from Microsoft 365.
            </p>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={syncDirectory} disabled={syncingDir} className="gap-1.5">
              {syncingDir ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Sync Microsoft 365 directory
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin && connected && !hasOrgInfo && (
            <div className="rounded-lg border border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.10)] p-3 text-xs text-foreground">
              Microsoft 365 is connected but your org details aren't synced yet. Run{" "}
              <span className="font-medium">Sync Microsoft 365 directory</span> to populate titles,
              departments, and the reporting hierarchy (needed for the Org Chart).
            </div>
          )}
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Title</dt>
              <dd className="text-sm text-foreground">{profile.title || "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Department</dt>
              <dd className="text-sm text-foreground">{profile.department || "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Office</dt>
              <dd className="text-sm text-foreground">{officeLocation || "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reports to</dt>
              <dd className="text-sm text-foreground">
                {manager?.full_name || manager?.email || profile.manager_email || "—"}
              </dd>
            </div>
          </dl>

          <div className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Direct reports {directReports.length > 0 && `(${directReports.length})`}
            </div>
            {directReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No direct reports.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {directReports.map((r) => (
                  <li
                    key={r.user_id}
                    className="flex items-center gap-2 rounded-full border border-border bg-muted/40 py-1 pl-1 pr-3"
                  >
                    <EntityAvatar type="user" seed={r.user_id} name={r.full_name || r.email || ""} size="sm" />
                    <span className="text-xs text-foreground">{r.full_name || r.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Microsoft 365 connections + first-time onboarding */}
      <Microsoft365Connections />

      {/* Appearance — theme + density (functionality preserved) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <p className="text-xs text-muted-foreground">
            Tune the look of the hub. Press <kbd className="kbd">⌘⇧D</kbd> any time to toggle dark/light.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label className="block">Theme</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">Dark or light variant.</p>
            </div>
            <ToggleGroup
              type="single"
              value={theme}
              onValueChange={(v) => v && setTheme(v as Theme)}
              className="justify-start"
            >
              <ToggleGroupItem value="dark" aria-label="Dark theme" className="gap-1.5">
                <Moon className="h-3.5 w-3.5" /> Dark
              </ToggleGroupItem>
              <ToggleGroupItem value="light" aria-label="Light theme" className="gap-1.5">
                <Sun className="h-3.5 w-3.5" /> Light
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label className="block">Density</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Compact tightens spacing in lists and tables.
              </p>
            </div>
            <ToggleGroup
              type="single"
              value={density}
              onValueChange={(v) => v && setDensity(v as Density)}
              className="justify-start"
            >
              <ToggleGroupItem value="comfortable" aria-label="Comfortable density" className="gap-1.5">
                <Rows3 className="h-3.5 w-3.5" /> Comfortable
              </ToggleGroupItem>
              <ToggleGroupItem value="compact" aria-label="Compact density" className="gap-1.5">
                <Rows4 className="h-3.5 w-3.5" /> Compact
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <AppearanceColors />
        </CardContent>
      </Card>
    </div>
  );
}
