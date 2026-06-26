import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { Page, PageVisibility } from "@/types/pages";
import { useUpdatePageMeta, useUpdatePageTitle } from "@/hooks/use-page";
import { useAuth } from "@/contexts/AuthContext";

const EMOJIS = ["📄","📝","📚","📌","✅","⭐","🚀","🎯","💡","🔧","🎨","📊"];

interface Props { page: Page }

export function PageHeader({ page }: Props) {
  const [title, setTitle] = useState(page.title);
  const [pendingVis, setPendingVis] = useState<PageVisibility | null>(null);
  const updateTitle = useUpdatePageTitle(page.id);
  const updateMeta = useUpdatePageMeta(page.id);
  const { profile } = useAuth();

  useEffect(() => setTitle(page.title), [page.id, page.title]);

  const flushTitle = () => {
    if (title.trim() && title !== page.title) updateTitle.mutate(title.trim());
  };

  const handleVisibility = (v: PageVisibility) => {
    if (v === "department") { setPendingVis(v); return; }
    updateMeta.mutate({ visibility: v });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="mt-1 h-11 w-11 shrink-0 rounded-lg text-3xl hover:bg-accent"
              aria-label="Pick page icon"
            >
              {page.icon ?? <Smile className="h-6 w-6 text-muted-foreground" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2">
            <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Page icon
            </p>
            <div className="grid grid-cols-6 gap-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => updateMeta.mutate({ icon: e })}
                  className="rounded-md p-1 text-xl transition-colors duration-fast hover:bg-accent"
                >
                  {e}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full text-muted-foreground"
              onClick={() => updateMeta.mutate({ icon: null })}
            >
              Remove icon
            </Button>
          </PopoverContent>
        </Popover>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={flushTitle}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          placeholder="Untitled"
          className="h-auto flex-1 border-0 bg-transparent px-1 py-1 font-display text-3xl font-semibold leading-tight tracking-tight shadow-none focus-visible:ring-0"
          maxLength={200}
        />
        <Select value={page.visibility} onValueChange={(v) => handleVisibility(v as PageVisibility)}>
          <SelectTrigger className="mt-1 h-9 w-32 shrink-0 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="department">Department</SelectItem>
            <SelectItem value="public">Public</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AlertDialog open={!!pendingVis} onOpenChange={(o) => !o && setPendingVis(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Share with department?</AlertDialogTitle>
            <AlertDialogDescription>
              Everyone in {profile?.department ?? "your department"} will be able to view this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                updateMeta.mutate({
                  visibility: "department",
                  department_id: profile?.department_id ?? null,
                });
                setPendingVis(null);
              }}
            >
              Share
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}