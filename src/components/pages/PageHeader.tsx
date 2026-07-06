import { useEffect, useRef, useState } from "react";
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
import { Image, Share2, Smile, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { Page, PageVisibility } from "@/types/pages";
import { useUpdatePageMeta, useUpdatePageTitle } from "@/hooks/use-page";
import { useAuth } from "@/contexts/AuthContext";
import { PageShareDialog } from "@/components/pages/PageShareDialog";
import { OpenInMemoryGraphButton } from "@/components/graph/OpenInMemoryGraphButton";
import { cn } from "@/lib/utils";

const EMOJIS = [
  "📄","📝","📚","📌","✅","⭐","🚀","🎯","💡","🔧","🎨","📊",
  "🗂️","🔖","🧭","🧩","📈","🗓️","🧠","🔍","🏷️","📎","💬","🏁",
];

/**
 * Curated cover washes built from design tokens (no external images → no CSP or
 * asset concerns). Stored in `cover_url` as `token:<key>` so we never persist a
 * remote URL; `updatePageMeta` already accepts `cover_url`.
 */
const COVER_WASHES: Record<string, string> = {
  crimson: "linear-gradient(120deg, hsl(var(--primary) / 0.85), hsl(var(--primary) / 0.35))",
  task: "linear-gradient(120deg, hsl(var(--entity-task) / 0.8), hsl(var(--entity-task) / 0.3))",
  request: "linear-gradient(120deg, hsl(var(--entity-request) / 0.8), hsl(var(--entity-request) / 0.3))",
  project: "linear-gradient(120deg, hsl(var(--entity-project) / 0.8), hsl(var(--entity-project) / 0.3))",
  slate: "linear-gradient(120deg, hsl(var(--muted-foreground) / 0.5), hsl(var(--muted) / 0.6))",
  dawn: "linear-gradient(120deg, hsl(var(--priority-high) / 0.7), hsl(var(--priority-medium) / 0.4))",
};
const COVER_KEYS = Object.keys(COVER_WASHES);

function coverStyle(cover: string | null): string | null {
  if (!cover) return null;
  if (cover.startsWith("token:")) return COVER_WASHES[cover.slice(6)] ?? null;
  return null; // legacy/remote urls are not rendered (react-markdown-safe policy)
}

interface Props { page: Page }

export function PageHeader({ page }: Props) {
  const [title, setTitle] = useState(page.title);
  const [pendingVis, setPendingVis] = useState<PageVisibility | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const updateTitle = useUpdatePageTitle(page.id);
  const updateMeta = useUpdatePageMeta(page.id);
  const { profile } = useAuth();

  useEffect(() => setTitle(page.title), [page.id, page.title]);

  // Auto-grow the title textarea so long titles wrap instead of scrolling.
  useEffect(() => {
    const ta = titleRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [title]);

  const flushTitle = () => {
    const next = title.trim();
    if (next && next !== page.title) updateTitle.mutate(next);
  };

  const handleVisibility = (v: PageVisibility) => {
    if (v === "department") { setPendingVis(v); return; }
    updateMeta.mutate({ visibility: v });
  };

  const cover = coverStyle(page.cover_url);

  return (
    <div>
      {/* Cover wash (optional, token-built). Hover to add/change/remove. */}
      <div className={cn("group/cover relative", cover ? "mb-3" : "mb-1")}>
        {cover && (
          <div
            className="h-[150px] w-full rounded-lg"
            style={{ background: cover }}
            aria-hidden
          />
        )}
        <div
          className={cn(
            "flex justify-end gap-1 transition-opacity duration-fast",
            cover
              ? "absolute right-2 top-2 opacity-0 group-hover/cover:opacity-100"
              : "opacity-0 group-hover/cover:opacity-100",
          )}
        >
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={cover ? "secondary" : "ghost"}
                size="sm"
                className="h-7 gap-1.5 text-xs"
              >
                <Image className="h-3.5 w-3.5" aria-hidden /> {cover ? "Change cover" : "Add cover"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
              <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Cover
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {COVER_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => updateMeta.mutate({ cover_url: `token:${k}` })}
                    className="h-10 rounded-md ring-offset-background transition hover:ring-2 hover:ring-ring/40"
                    style={{ background: COVER_WASHES[k] }}
                    aria-label={`Use ${k} cover`}
                  />
                ))}
              </div>
              {cover && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full gap-1.5 text-muted-foreground"
                  onClick={() => updateMeta.mutate({ cover_url: null })}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove cover
                </Button>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Large icon above the title (overlaps the cover's bottom edge). */}
      <div className={cn(cover && "-mt-9 pl-1")}>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-14 w-14 rounded-lg text-4xl hover:bg-accent",
                cover && "bg-card shadow-sm ring-1 ring-border",
              )}
              aria-label="Pick page icon"
            >
              {page.icon ?? <Smile className="h-7 w-7 text-muted-foreground" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Page icon
            </p>
            <div className="grid grid-cols-8 gap-1">
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
      </div>

      {/* The page title — Fraunces display face, reads as a title not a form field. */}
      <textarea
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={flushTitle}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); }
        }}
        rows={1}
        placeholder="Untitled"
        aria-label="Page title"
        maxLength={200}
        className="mt-1 block w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-display text-[2rem] font-semibold leading-tight tracking-tight text-foreground shadow-none outline-none placeholder:text-muted-foreground/50 focus:outline-none focus-visible:ring-0"
      />

      {/* Quiet meta row — visibility, share, graph. No heavy toolbar. */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Select value={page.visibility} onValueChange={(v) => handleVisibility(v as PageVisibility)}>
          <SelectTrigger className="h-8 w-[116px] border-0 bg-transparent px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="department">Department</SelectItem>
            <SelectItem value="public">Public</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-border" aria-hidden>·</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShareOpen(true)}
        >
          <Share2 className="h-3.5 w-3.5" /> Share
        </Button>
        <span className="text-border" aria-hidden>·</span>
        <OpenInMemoryGraphButton
          type="page"
          id={page.id}
          variant="ghost"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
        />
      </div>

      <PageShareDialog
        pageId={page.id}
        ownerId={page.owner_id}
        visibility={page.visibility}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />

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
