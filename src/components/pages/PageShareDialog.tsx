import { Trash2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StakeholderPicker } from "@/components/projects/StakeholderPicker";
import { usePageShares, usePageShareMutations } from "@/hooks/use-page";
import type { PageShareRole, PageVisibility } from "@/types/pages";

interface Props {
  pageId: string;
  ownerId: string;
  visibility: PageVisibility;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Per-person sharing dialog (Feature 6). Lists who a page is shared with, lets
 * the owner add people (via the M365 directory picker), change each grant's role
 * (view/edit), and revoke. Visibility (private/department/public) is set
 * separately in the page header; this adds explicit named grants on top.
 */
export function PageShareDialog({ pageId, ownerId, visibility, open, onOpenChange }: Props) {
  const { data: shares = [], isLoading } = usePageShares(open ? pageId : undefined);
  const { add, updateRole, remove } = usePageShareMutations(pageId);

  const existingIds = [ownerId, ...shares.map((s) => s.grantee_user_id)];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Share page
          </DialogTitle>
          <DialogDescription>
            {visibility === "public"
              ? "This page is public — everyone can view it. Named grants below still control edit access."
              : visibility === "department"
                ? "Visible to your department. Add specific people for extra access."
                : "Private. Only you, people you add here, your manager, and admins can see it."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              People with access
            </span>
            <StakeholderPicker
              existingUserIds={existingIds}
              triggerLabel="Add people"
              onSelect={(p) => add.mutate({ granteeUserId: p.user_id, role: "view" })}
            />
          </div>

          {isLoading ? (
            <p className="py-4 text-center text-xs text-muted-foreground">Loading…</p>
          ) : shares.length === 0 ? (
            <p className="rounded-md border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
              Not shared with anyone specific yet.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {shares.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--entity-person)/0.14)] text-[11px] font-medium text-[hsl(var(--entity-person))]">
                    {(s.full_name || s.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {s.full_name || s.email || s.grantee_user_id}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {s.title || s.department || s.email}
                    </p>
                  </div>
                  <Select
                    value={s.role}
                    onValueChange={(v) => updateRole.mutate({ shareId: s.id, role: v as PageShareRole })}
                  >
                    <SelectTrigger className="h-7 w-20 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View</SelectItem>
                      <SelectItem value="edit">Edit</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${s.full_name || "person"}`}
                    onClick={() => remove.mutate(s.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
