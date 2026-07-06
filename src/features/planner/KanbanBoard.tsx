/**
 * Kanban board — orchestrates buckets, cards, native drag-and-drop, and the
 * card detail dialog. Backed by usePlannerBoard (demo data + localStorage in
 * preview; Supabase-backed at deploy).
 */
import { useRef, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlannerBoard } from "./usePlannerBoard";
import { orderedBuckets, cardsInBucket } from "./plannerBoard";
import { KanbanColumn } from "./KanbanColumn";
import { CardDetailDialog } from "./CardDetailDialog";
import { DEMO_USERS } from "./demoData";
import type { PlannerCard } from "./types";

export function KanbanBoard({
  controller,
  users = DEMO_USERS,
  showReset = true,
}: {
  /** Board controller (demo or Supabase-backed) shared with the charts view. */
  controller: ReturnType<typeof usePlannerBoard>;
  /** Assignee / @mention directory (demo users in preview, real profiles in prod). */
  users?: { id: string; name: string }[];
  /** Hide the "Reset" button in production (it re-fetches, not reset-to-demo). */
  showReset?: boolean;
}) {
  const board = controller;
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [addingBucket, setAddingBucket] = useState(false);
  const [bucketName, setBucketName] = useState("");
  const draggingCard = useRef<string | null>(null);

  const buckets = orderedBuckets(board.board);
  const openCard =
    board.board.cards.find((c) => c.id === openCardId) ?? null;

  function handleDrop(toBucketId: string, toIndex: number) {
    const id = draggingCard.current;
    if (!id) return;
    board.moveCard(id, toBucketId, toIndex);
    draggingCard.current = null;
  }

  function addBucket() {
    if (bucketName.trim()) board.addBucket(bucketName);
    setBucketName("");
    setAddingBucket(false);
  }

  const now = Date.now();
  const overdueCount = board.board.cards.filter(
    (c) =>
      c.dueDate &&
      c.status !== "completed" &&
      new Date(c.dueDate).getTime() < now,
  ).length;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{board.board.projectTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {board.board.cards.length} cards
            {overdueCount > 0 && (
              <span className="text-destructive"> · {overdueCount} overdue</span>
            )}
          </p>
        </div>
        {showReset ? (
          <Button variant="ghost" size="sm" onClick={board.reset} title="Restore the demo board to its starting state">
            <RotateCcw className="mr-1.5 h-4 w-4" /> Reset demo
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={board.reset} title="Refresh from server">
            <RotateCcw className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
        )}
      </div>

      <div className="flex flex-1 gap-3 overflow-x-auto pb-4">
        {buckets.map((bucket, i) => (
          <KanbanColumn
            key={bucket.id}
            bucket={bucket}
            index={i}
            count={buckets.length}
            cards={cardsInBucket(board.board, bucket.id)}
            users={users}
            onOpenCard={(c: PlannerCard) => setOpenCardId(c.id)}
            onAddCard={(bucketId) =>
              board.addCard(bucketId, { title: "Untitled", kind: "task" })
            }
            onRename={board.renameBucket}
            onRemove={board.removeBucket}
            onMoveBucket={board.reorderBucket}
            onCardDragStart={(id) => (draggingCard.current = id)}
            onDropCard={handleDrop}
          />
        ))}

        <div className="w-72 shrink-0">
          {addingBucket ? (
            <div className="rounded-xl border border-border bg-muted/40 p-2">
              <Input
                autoFocus
                value={bucketName}
                placeholder="Bucket name"
                onChange={(e) => setBucketName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addBucket();
                  if (e.key === "Escape") setAddingBucket(false);
                }}
                className="mb-2 h-8"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addBucket}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingBucket(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start border-dashed text-muted-foreground"
              onClick={() => setAddingBucket(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add bucket
            </Button>
          )}
        </div>
      </div>

      <CardDetailDialog
        card={openCard}
        users={users}
        onClose={() => setOpenCardId(null)}
        onUpdate={board.updateCard}
        onDelete={board.removeCard}
      />
    </div>
  );
}
