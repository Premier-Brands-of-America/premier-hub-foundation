/**
 * A Kanban bucket column — droppable target, inline rename, add-card, delete.
 *
 * The header borrows the pressroom proof-state color language: a status dot
 * tinted by the bucket's mapped proof state (name-matched; ad-hoc buckets stay
 * neutral), a count pill, a per-column overdue rollup, and — for in-progress
 * lanes — a lightweight WIP hint so a lane that's piling up reads at a glance.
 */
import { useState } from "react";
import { Plus, MoreHorizontal, Trash2, Pencil, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./KanbanCard";
import { bucketProofState, isWipLane } from "./plannerFilters";
import { PROOF_META } from "@/components/pressroom";
import type { Bucket, PlannerCard } from "./types";

/** WIP soft-limit for in-progress-style lanes — a hint, never a hard block. */
const WIP_LIMIT = 5;

export function KanbanColumn({
  bucket,
  cards,
  index,
  count,
  users: _users,
  onOpenCard,
  onAddCard,
  onRename,
  onRemove,
  onMoveBucket,
  onCardDragStart,
  onDropCard,
}: {
  bucket: Bucket;
  cards: PlannerCard[];
  index: number;
  count: number;
  users: { id: string; name: string }[];
  onOpenCard: (card: PlannerCard) => void;
  onAddCard: (bucketId: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onMoveBucket: (id: string, toIndex: number) => void;
  onCardDragStart: (cardId: string) => void;
  onDropCard: (toBucketId: string, toIndex: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(bucket.name);
  const [dragOver, setDragOver] = useState(false);

  const proofState = bucketProofState(bucket.name, cards);
  // Neutral fallback keeps ad-hoc buckets in the chip grammar without a label.
  const dotToken = proofState ? PROOF_META[proofState].token : "--status-neutral";

  const now = Date.now();
  const overdue = cards.filter(
    (c) => c.dueDate && c.status !== "completed" && new Date(c.dueDate).getTime() < now,
  ).length;

  const showWip = isWipLane(proofState);

  return (
    <div
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border bg-muted/40 transition-colors",
        dragOver ? "border-primary bg-primary/5" : "border-border",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onDropCard(bucket.id, cards.length);
      }}
    >
      <div className="flex flex-col gap-1.5 border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: `hsl(var(${dotToken}))` }}
            aria-hidden
          />
          {editing ? (
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                onRename(bucket.id, name);
                setEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onRename(bucket.id, name);
                  setEditing(false);
                }
                if (e.key === "Escape") setEditing(false);
              }}
              className="h-7 text-sm font-semibold"
            />
          ) : (
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{bucket.name}</h3>
          )}
          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
            {cards.length}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`${bucket.name} options`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={index === 0}
                onClick={() => onMoveBucket(bucket.id, index - 1)}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Move left
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={index === count - 1}
                onClick={() => onMoveBucket(bucket.id, index + 1)}
              >
                <ChevronRight className="mr-2 h-4 w-4" /> Move right
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onRemove(bucket.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete bucket
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {(overdue > 0 || showWip) && (
          <div className="flex items-center gap-2 pl-4">
            {overdue > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium tabular-nums text-destructive">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                {overdue} overdue
              </span>
            )}
            {showWip && (
              <span
                className={cn(
                  "ml-auto inline-flex items-center gap-2 text-[11px] font-medium tabular-nums text-muted-foreground",
                  cards.length > WIP_LIMIT && "text-warning",
                )}
                title={`WIP limit: ${WIP_LIMIT}`}
              >
                <span className="flex gap-0.5" aria-hidden>
                  {Array.from({ length: WIP_LIMIT }).map((_, m) => (
                    <span
                      key={m}
                      className={cn(
                        "h-1 w-1.5 rounded-sm",
                        m < cards.length ? "bg-warning" : "bg-border",
                      )}
                    />
                  ))}
                </span>
                {cards.length}/{WIP_LIMIT} WIP
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex max-h-[calc(100vh-18rem)] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 pt-2">
        {cards.map((card, i) => (
          <div
            key={card.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(false);
              onDropCard(bucket.id, i);
            }}
          >
            <KanbanCard
              card={card}
              onOpen={() => onOpenCard(card)}
              onDragStart={() => onCardDragStart(card.id)}
            />
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="justify-start text-muted-foreground"
          onClick={() => onAddCard(bucket.id)}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add card
        </Button>
      </div>
    </div>
  );
}
