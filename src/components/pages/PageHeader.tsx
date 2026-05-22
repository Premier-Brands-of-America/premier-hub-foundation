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
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="text-2xl px-2" aria-label="Pick icon">
              {page.icon ?? <Smile className="h-5 w-5 text-muted-foreground" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2">
            <div className="grid grid-cols-6 gap-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => updateMeta.mutate({ icon: e })}
                  className="text-xl rounded hover:bg-accent p-1"
                >
                  {e}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => updateMeta.mutate({ icon: null })}
            >
              Remove
            </Button>
          </PopoverContent>
        </Popover>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={flushTitle}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          placeholder="Untitled"
          className="text-3xl font-bold border-0 px-1 focus-visible:ring-0 shadow-none h-auto"
          maxLength={200}
        />
        <Select value={page.visibility} onValueChange={(v) => handleVisibility(v as PageVisibility)}>
          <SelectTrigger className="w-36">
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