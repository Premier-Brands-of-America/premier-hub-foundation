import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
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
import { FilePlus, FileText, Folder, Link2, Loader2 } from "lucide-react";
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

  const Editor = page ? (
    <div className="flex h-full flex-col overflow-auto">
      <ActiveAccessBanner targetType="page" targetId={page.id} onRevoked={() => refetch()} />
      <div className="flex flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex w-full flex-1 flex-col">
          <PageBreadcrumbs pageId={page.id} />
          {/* The one bold element on this screen: the crimson edge-rail document header. */}
          <div className="edge-rail">
            <PageDocHeader page={page} />
          </div>
          <div className="mt-6 min-h-0 flex-1">
            <PageEditor
              pageId={page.id}
              initialContent={page.body_md ?? ""}
              onChange={(md) => saveBody.mutate(md)}
            />
          </div>
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

      {/* Desktop: tree · canvas, with backlinks demoted to a collapsible rail so
          the writing column reclaims the full width and centers at ~760px. */}
      <div className="hidden h-[calc(100vh-4rem)] lg:block">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={22} minSize={16}>
            <div className="h-full border-r border-border bg-card">{Tree}</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={78} minSize={40}>
            <div className="flex h-full bg-background">
              <div className="min-w-0 flex-1">{Editor}</div>
              {page && <BacklinksRail page={page} />}
            </div>
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
 * Backlinks demoted to a collapsible rail (desktop). Collapsed, it's a slim
 * ~40px vertical "Links · N" tab; expanded, a 280px panel. It never occupies
 * the canvas by default, so the writing column keeps its full width.
 */
function BacklinksRail({ page }: { page: Page }) {
  const [open, setOpen] = useState(false);
  const { data = [] } = useBacklinks("page", page.id);

  if (open) {
    return (
      <aside className="flex h-full w-[280px] shrink-0 flex-col overflow-auto border-l border-border bg-card">
        <BacklinksPanel
          targetType="page"
          targetId={page.id}
          pageTitle={page.title || "Untitled"}
          onClose={() => setOpen(false)}
        />
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-10 shrink-0 flex-col items-center border-l border-border bg-card pt-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        aria-label={`Show backlinks · ${data.length} mentioning this page`}
        title="Backlinks"
        className="flex items-center justify-center gap-2 rounded-md px-1.5 py-3 text-xs font-medium tabular-nums text-muted-foreground transition-colors duration-fast hover:bg-accent hover:text-foreground [writing-mode:vertical-rl]"
      >
        <Link2 className="h-3.5 w-3.5 rotate-90" aria-hidden />
        Links · {data.length}
      </button>
    </aside>
  );
}
