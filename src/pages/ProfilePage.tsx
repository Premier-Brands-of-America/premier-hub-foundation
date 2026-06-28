import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Moon, Sun, Rows3, Rows4 } from "lucide-react";
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

export default function ProfilePage() {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [departmentId, setDepartmentId] = useState<string>(profile?.department_id ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null,
  );
  const [saving, setSaving] = useState(false);
  const { theme, setTheme, density, setDensity } = useDesignMode();

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

  if (!profile) return null;

  const azureOid = (profile as { azure_oid?: string }).azure_oid ?? "";
  const role = profile.role ?? "requester";

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
