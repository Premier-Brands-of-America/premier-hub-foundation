import { useState } from "react";
import { Check, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { useDashboardLayout } from "./useDashboardLayout";
import { DashboardGrid } from "./DashboardGrid";
import { AddCardMenu } from "./AddCardMenu";
import { ResetLayoutDialog } from "./ResetLayoutDialog";

export function DashboardView() {
  const layout = useDashboardLayout();
  const [editing, setEditing] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  if (layout.isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-4">
      {/* Toolbar — progressive disclosure: clean in view mode, controls in edit mode */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Dashboard</h2>
          {editing && (
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {layout.isSaving ? "Saving…" : "Saved"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <AddCardMenu onAdd={layout.addCard} />
              <Button
                size="sm"
                variant="ghost"
                className="gap-2"
                onClick={() => setResetOpen(true)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
              <Button size="sm" className="gap-2" onClick={() => setEditing(false)}>
                <Check className="h-3.5 w-3.5" />
                Done
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit dashboard
            </Button>
          )}
        </div>
      </div>

      {layout.isError && (
        <p className="text-sm text-destructive">
          Couldn't load your saved layout — showing defaults.
        </p>
      )}

      <DashboardGrid
        editing={editing}
        layout={layout}
        emptyAction={<AddCardMenu onAdd={layout.addCard} />}
      />

      <ResetLayoutDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        onConfirm={() => {
          layout.reset();
          setResetOpen(false);
        }}
      />
    </div>
  );
}
