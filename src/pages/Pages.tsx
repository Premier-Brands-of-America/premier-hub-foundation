import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageTree } from "@/components/pages/PageTree";
import { PageEditor } from "@/components/pages/PageEditor";
import { PageHeader as PageDocHeader } from "@/components/pages/PageHeader";
import { PageBreadcrumbs } from "@/components/pages/PageBreadcrumbs";
import { BacklinksPanel } from "@/components/pages/BacklinksPanel";
import { usePage, useSavePageBody } from "@/hooks/use-page";
import { useCreatePage, usePageTree } from "@/hooks/use-pages";
import { useBacklinks } from "@/hooks/use-backlinks";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/PageHeader";
import { ChevronDown, FilePlus, FileText, Folder, Link2, Loader2 } from "lucide-react";
import type { Page } from "@/types/pages";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import { PromptDialog } from "@/components/pages/PromptDialog";
import { useAuth } from "@/contexts/AuthContext";
import { RestrictedContentPanel } from "@/components/admin-access/RestrictedContentPanel";
import { ActiveAccessBanner } from "@/components/admin-access/ActiveAccessBanner";

const MOBILE_TABS = [
  { id: "tree", label: "Pages", icon: Folder },
  { id: "editor", label: "Editor", icon: FileText },
  { id: "backlinks", label: "Links", icon: Link2 },
] as const;

/** Centered reading/writing measure — the calm canvas the redesign reclaims. */
const MEASURE = "mx-auto w-full max-w-[760px]";

export default function PagesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.is_admin ?? false;
  const { data: page, isLoading, refetch } = usePage(id);
  const saveBody = useSavePageBody(id);
  const createMut = useCreatePage();
  const { data: tree = [] } = usePageTree();
  const [mobileTab, setMobileTab] = useState<"tree" | "editor" | "backlinks">("editor");
  const [newOpen, setNewOpen] = useState(false);

  // Auto-select first page if none in URL
  useEffect(() => {
    if (!id && tree.length > 0) {
      navigate(`/pages/${tree[0].id}`, { replace: true });
    }
  }, [id, tree, navigate]);

  const handleNewRoot = () => setNewOpen(true);

  const Tree = (
    <PageTree activeId={id} onSelect={(pid) => navigate(`/pages/${pid}`)} />
  );

  // The document canvas: a single centered column carrying the page head, the
  // one always-formatted writing surface, then the "Mentioned in" section.
  const Editor = page ? (
    <div className="flex h-full flex-col overflow-auto">
      <ActiveAccessBanner targetType="page" targetId={page.id} onRevoked={() => refetch()} />
      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className={MEASURE}>
          <PageBreadcrumbs pageId={page.id} />
          {/* The one bold element: the crimson edge-rail on the page head. */}
          <div className="edge-rail">
            <PageDocHeader page={page} />
          </div>
          <div className="mt-6">
            <PageEditor
              pageId={page.id}
              initialContent={page.body_md ?? ""}
              onChange={(md) => saveBody.mutate(md)}
            />
          </div>
          {/* Backlinks live at the bottom of the reading column, not a 3rd rail. */}
          <BacklinksSection page={page} />
        </div>
      </div>
    </div>
  ) : (
    <div className="flex h-full items-center justify-center p-8">
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading page…
        </div>
      ) : id && isAdmin ? (
        // Forbidden by RLS + the viewer is an admin: offer break-glass access.
        <RestrictedContentPanel targetType="page" targetId={id} onGranted={() => refetch()} />
      ) : (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="No page selected"
          description="Pick a page from the tree on the left, or start a fresh one."
          action={
            <Button onClick={handleNewRoot} size="sm" className="gap-2">
              <FilePlus className="h-3.5 w-3.5" /> New page
            </Button>
          }
        />
      )}
    </div>
  );

  // Mobile "Links" tab reuses the same panel (already safe: MatchHighlight).
  const Back = page ? (
    <div className="h-full overflow-auto p-4">
      <BacklinksPanel targetType="page" targetId={page.id} pageTitle={page.title || "Untitled"} />
    </div>
  ) : null;

  return (
    <>
      <PageHeader
        title="Pages"
        subtitle={page ? (page.title || "Untitled") : "Your linked knowledge base"}
        actions={
          <Button onClick={handleNewRoot} size="sm" className="gap-2">
            <FilePlus className="h-3.5 w-3.5" /> New page
          </Button>
        }
      />

      {/* Desktop: two regions only — tree · canvas. Backlinks are demoted to a
          section inside the canvas so the writing column reclaims the width. */}
      <div className="hidden h-[calc(100vh-4rem)] lg:block">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={22} minSize={16}>
            <div className="h-full border-r border-border bg-card">{Tree}</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={78} minSize={40}>
            <div className="h-full bg-background">{Editor}</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile / tablet: segmented tabs */}
      <div className="lg:hidden">
        <div role="tablist" className="flex gap-1 border-b border-border bg-card px-2 py-1.5">
          {MOBILE_TABS.map((t) => {
            const Icon = t.icon;
            const active = mobileTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMobileTab(t.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-fast",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="h-[calc(100vh-7rem)]">
          {mobileTab === "tree" && Tree}
          {mobileTab === "editor" && Editor}
          {mobileTab === "backlinks" && Back}
        </div>
      </div>

      <PromptDialog
        open={newOpen}
        title="New page"
        description="Give your page a title. You can rename it any time."
        defaultValue="Untitled"
        confirmLabel="Create page"
        onCancel={() => setNewOpen(false)}
        onConfirm={async (title) => {
          try {
            const newId = await createMut.mutateAsync({ title });
            setNewOpen(false);
            navigate(`/pages/${newId}`);
          } catch (e) {
            // Surface the real cause instead of failing silently; keep the
            // dialog open so the user can retry. Supabase throws a PostgrestError
            // object (not an Error), so use robust extraction to reveal it.
            toast.error(getErrorMessage(e, "Failed to create page"));
          }
        }}
      />
    </>
  );
}

/**
 * "Mentioned in" as a collapsible section at the foot of the reading column
 * (Notion/Obsidian placement), replacing the old permanent right rail. Collapsed
 * by default when the list is long, so it never crowds the writing surface.
 */
function BacklinksSection({ page }: { page: Page }) {
  const { data = [] } = useBacklinks("page", page.id);
  const [open, setOpen] = useState(data.length > 0 && data.length <= 4);

  return (
    <div className="mt-12 border-t border-border pt-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group flex w-full items-center gap-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform duration-fast", !open && "-rotate-90")}
              aria-hidden
            />
            <Link2 className="h-3.5 w-3.5" aria-hidden />
            Mentioned in
            <span className="stat-numeral tabular-nums text-muted-foreground">{data.length}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <BacklinksPanel
            targetType="page"
            targetId={page.id}
            pageTitle={page.title || "Untitled"}
            hideHeader
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
