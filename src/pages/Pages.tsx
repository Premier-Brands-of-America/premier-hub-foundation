import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { PageTree } from "@/components/pages/PageTree";
import { PageEditor } from "@/components/pages/PageEditor";
import { PageHeader as PageDocHeader } from "@/components/pages/PageHeader";
import { PageBreadcrumbs } from "@/components/pages/PageBreadcrumbs";
import { BacklinksPanel } from "@/components/pages/BacklinksPanel";
import { usePage, useSavePageBody } from "@/hooks/use-page";
import { useCreatePage, usePageTree } from "@/hooks/use-pages";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/PageHeader";
import { FilePlus, FileText, Folder, Link2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PromptDialog } from "@/components/pages/PromptDialog";

const MOBILE_TABS = [
  { id: "tree", label: "Pages", icon: Folder },
  { id: "editor", label: "Editor", icon: FileText },
  { id: "backlinks", label: "Links", icon: Link2 },
] as const;

export default function PagesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: page, isLoading } = usePage(id);
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
    <div className="flex h-full flex-col overflow-auto px-4 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
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
  ) : (
    <div className="flex h-full items-center justify-center p-8">
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading page…
        </div>
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
      <BacklinksPanel targetType="page" targetId={page.id} />
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

      {/* Desktop: three resizable panes — tree · canvas · backlinks */}
      <div className="hidden h-[calc(100vh-4rem)] lg:block">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={20} minSize={15}>
            <div className="h-full border-r border-border bg-card">{Tree}</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={55} minSize={30}>
            <div className="h-full bg-background">{Editor}</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={25} minSize={15}>
            <div className="h-full border-l border-border bg-card">{Back}</div>
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
          setNewOpen(false);
          const newId = await createMut.mutateAsync({ title });
          navigate(`/pages/${newId}`);
        }}
      />
    </>
  );
}
