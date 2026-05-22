import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { PageTree } from "@/components/pages/PageTree";
import { PageEditor } from "@/components/pages/PageEditor";
import { PageHeader } from "@/components/pages/PageHeader";
import { PageBreadcrumbs } from "@/components/pages/PageBreadcrumbs";
import { BacklinksPanel } from "@/components/pages/BacklinksPanel";
import { usePage, useSavePageBody } from "@/hooks/use-page";
import { useCreatePage, usePageTree } from "@/hooks/use-pages";
import { Button } from "@/components/ui/button";
import { FilePlus } from "lucide-react";
import { PromptDialog } from "@/components/pages/PromptDialog";

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
    <div className="flex flex-col h-full p-6 overflow-auto">
      <PageBreadcrumbs pageId={page.id} />
      <PageHeader page={page} />
      <div className="flex-1 mt-4 min-h-0">
        <PageEditor
          pageId={page.id}
          initialContent={page.body_md ?? ""}
          onChange={(md) => saveBody.mutate(md)}
        />
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-3">
      <p className="text-sm text-muted-foreground">
        {isLoading ? "Loading…" : "Select a page from the left, or create a new one."}
      </p>
      {!isLoading && (
        <Button onClick={handleNewRoot} size="sm"><FilePlus className="h-4 w-4 mr-1" /> New page</Button>
      )}
    </div>
  );

  const Back = page ? (
    <div className="p-4 overflow-auto h-full">
      <BacklinksPanel targetType="page" targetId={page.id} />
    </div>
  ) : null;

  return (
    <>
      {/* Desktop: three resizable panes */}
      <div className="hidden lg:block h-[calc(100vh-4rem)]">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={20} minSize={15}>{Tree}</ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={55} minSize={30}>{Editor}</ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={25} minSize={15}>{Back}</ResizablePanel>
        </ResizablePanelGroup>
      </div>
      {/* Mobile / tablet: tabbed */}
      <div className="lg:hidden">
        <div className="flex border-b">
          {(["tree","editor","backlinks"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMobileTab(t)}
              className={`flex-1 py-2 text-xs uppercase tracking-wide ${mobileTab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
            >
              {t}
            </button>
          ))}
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