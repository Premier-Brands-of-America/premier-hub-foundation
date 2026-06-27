/**
 * A Kanban bucket column — droppable target, inline rename, add-card, delete.
 */
import { useState } from "react";
import { Plus, MoreHorizontal, Trash2, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
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
import type { Bucket, PlannerCard } from "./types";

export function KanbanColumn({
  bucket,
  cards,
  index,
  count,
  users,
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
      <div className="flex items-center gap-1 px-3 py-2.5">
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
            }}
            className="h-7 text-sm font-semibold"
          />
        ) : (
          <h3 className="flex-1 truncate text-sm font-semibold">{bucket.name}</h3>
        )}
        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {cards.length}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
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

      <div className="flex max-h-[calc(100vh-18rem)] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
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
