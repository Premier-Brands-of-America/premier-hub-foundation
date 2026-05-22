import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DepartmentPicker } from "@/components/forms/DepartmentPicker";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDesignMode, type DesignMode, type Density } from "@/providers/DesignModeProvider";

export default function ProfilePage() {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [departmentId, setDepartmentId] = useState<string>(profile?.department_id ?? "");
  const [saving, setSaving] = useState(false);
  const { mode, setMode, density, setDensity } = useDesignMode();

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setDepartmentId(profile?.department_id ?? "");
  }, [profile?.id]);

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

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your name and department.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={profile.email ?? ""} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Microsoft Object ID</Label>
            <Input value={(profile as { azure_oid?: string }).azure_oid ?? ""} readOnly disabled className="font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Input value={profile.role ?? "requester"} readOnly disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Editable</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept">Department</Label>
            <DepartmentPicker id="dept" value={departmentId} onChange={setDepartmentId} />
          </div>
          <div className="flex justify-end">
            <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}