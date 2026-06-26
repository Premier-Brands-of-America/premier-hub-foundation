import { useState } from "react";
import { ChevronRight, ChevronDown, Plus, FileText, Archive, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { usePageTree, useCreatePage } from "@/hooks/use-pages";
import { useArchivePage } from "@/hooks/use-page";
import type { PageTreeNode } from "@/types/pages";
import { toast } from "@/hooks/use-toast";
import { PromptDialog } from "@/components/pages/PromptDialog";
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

interface Props {
  rootId?: string;
  activeId?: string;
  onSelect: (id: string) => void;
}

export function PageTree({ rootId, activeId, onSelect }: Props) {
  const { data: nodes = [], isLoading } = usePageTree(rootId);
  const createMut = useCreatePage();
  const archiveMut = useArchivePage();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [createParent, setCreateParent] = useState<{ open: boolean; parentId: string | null }>({ open: false, parentId: null });
  const [renameState, setRenameState] = useState<{ open: boolean; id: string; title: string } | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);

  const byParent = new Map<string | null, PageTreeNode[]>();
  for (const n of nodes) {
    const key = n.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(n);
  }
  const roots = byParent.get(null) ?? nodes.filter((n) => n.depth === 0);

  const handleCreate = (parentId: string | null) => setCreateParent({ open: true, parentId });
  const handleRename = (id: string, currentTitle: string) =>
    setRenameState({ open: true, id, title: currentTitle });

  const renderNode = (node: PageTreeNode) => {
    const kids = byParent.get(node.id) ?? [];
    const isOpen = expanded[node.id] ?? true;
    const hasKids = kids.length > 0;
    return (
      <li key={node.id} role="treeitem" aria-expanded={hasKids ? isOpen : undefined}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={cn(
                "group flex items-center gap-1 rounded-md px-1.5 py-1 text-sm transition-colors duration-fast hover:bg-accent",
                activeId === node.id
                  ? "bg-primary/10 font-medium text-foreground"
                  : "text-muted-foreground",
              )}
              aria-current={activeId === node.id ? "page" : undefined}
            >
              <button
                type="button"
                className="shrink-0 p-0.5 text-muted-foreground"
                onClick={() => setExpanded((e) => ({ ...e, [node.id]: !isOpen }))}
                aria-label={isOpen ? "Collapse" : "Expand"}
              >
                {hasKids ? (
                  isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                ) : (
                  <span className="inline-block w-3" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onSelect(node.id)}
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
              >
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-base leading-none">
                  {node.icon ?? <FileText className="h-3.5 w-3.5 opacity-70" />}
                </span>
                <span className="truncate">{node.title || "Untitled"}</span>
              </button>
              <button
                type="button"
                className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity duration-fast hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); handleCreate(node.id); }}
                aria-label="Add child page"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => handleRename(node.id, node.title)}>
              <Edit className="h-3.5 w-3.5 mr-2" /> Rename
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => setArchiveId(node.id)}
              className="text-destructive"
            >
              <Archive className="h-3.5 w-3.5 mr-2" /> Archive
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        {hasKids && isOpen && (
          <ul role="group" className="ml-4 border-l border-border/50 pl-1">
            {kids.map(renderNode)}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center justify-between border-b border-border px-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          All pages
        </h2>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => handleCreate(null)}
          aria-label="New page"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <ul role="tree" className="space-y-0.5 p-2">
          {isLoading && <li className="px-2 py-1 text-xs text-muted-foreground">Loading pages…</li>}
          {!isLoading && roots.length === 0 && (
            <li className="px-2 py-6 text-center text-xs text-muted-foreground">
              No pages yet.
              <br />
              Use <span className="font-medium text-foreground">+</span> to create your first one.
            </li>
          )}
          {roots.map(renderNode)}
        </ul>
      </ScrollArea>
      <PromptDialog
        open={createParent.open}
        title="New page"
        description="Give your page a title."
        defaultValue="Untitled"
        confirmLabel="Create page"
        onCancel={() => setCreateParent({ open: false, parentId: null })}
        onConfirm={async (title) => {
          const parentId = createParent.parentId;
          setCreateParent({ open: false, parentId: null });
          const id = await createMut.mutateAsync({ title, parent_id: parentId });
          if (parentId) setExpanded((e) => ({ ...e, [parentId]: true }));
          onSelect(id);
        }}
      />
      <PromptDialog
        open={!!renameState?.open}
        title="Rename page"
        defaultValue={renameState?.title ?? ""}
        confirmLabel="Rename"
        onCancel={() => setRenameState(null)}
        onConfirm={async (next) => {
          const target = renameState;
          setRenameState(null);
          if (!target || next === target.title) return;
          const { updatePageTitle } = await import("@/services/pagesService");
          await updatePageTitle(target.id, next);
          toast({ title: "Renamed" });
        }}
      />
      <AlertDialog open={!!archiveId} onOpenChange={(o) => !o && setArchiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this page?</AlertDialogTitle>
            <AlertDialogDescription>
              This page and any child pages will be archived.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const id = archiveId;
                setArchiveId(null);
                if (!id) return;
                await archiveMut.mutateAsync(id);
                toast({ title: "Page archived" });
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}