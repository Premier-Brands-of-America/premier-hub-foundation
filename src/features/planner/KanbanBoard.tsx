/**
 * Kanban board — orchestrates buckets, cards, native drag-and-drop, and the
 * card detail dialog. Backed by usePlannerBoard (demo data + localStorage in
 * preview; Supabase-backed at deploy).
 *
 * The filter bar is a pure presentation layer: it holds its selection in local
 * state and narrows the cards handed to each column. The board controller (demo
 * or Supabase) is never touched by filtering.
 */
import { useMemo, useRef, useState } from "react";
import { Plus, RotateCcw, ListFilter, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePlannerBoard } from "./usePlannerBoard";
import { orderedBuckets, cardsInBucket } from "./plannerBoard";
import { KanbanColumn } from "./KanbanColumn";
import { CardDetailDialog } from "./CardDetailDialog";
import { DEMO_USERS } from "./demoData";
import {
  EMPTY_FILTERS,
  isEmptyFilters,
  matchesFilters,
  DUE_FILTER_LABEL,
  PRIORITY_LABEL,
  type BoardFilters,
  type DueFilter,
} from "./plannerFilters";
import type { PlannerCard, CardPriority } from "./types";

const PRIORITY_ORDER: CardPriority[] = ["urgent", "high", "medium", "low"];
const DUE_OPTIONS: DueFilter[] = ["overdue", "week", "none"];

/** One dashed filter chip that opens a multi-select menu. */
function FilterMenu({
  label,
  options,
  selected,
  onToggle,
  render,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  render?: (value: string) => string;
}) {
  const active = selected.length > 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md border border-dashed px-2.5 text-xs font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            active
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground",
          )}
        >
          {label}
          {active && <span className="tabular-nums">· {selected.length}</span>}
          <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">No options</div>
        ) : (
          options.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt}
              checked={selected.includes(opt)}
              onCheckedChange={() => onToggle(opt)}
              onSelect={(e) => e.preventDefault()}
            >
              {render ? render(opt) : opt}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A removable active-filter chip. */
function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/50 bg-primary/10 pl-2.5 pr-1 text-xs font-medium text-primary">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-3 w-3" aria-hidden />
      </button>
    </span>
  );
}

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
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS);
  const draggingCard = useRef<string | null>(null);

  const buckets = orderedBuckets(board.board);
  const openCard = board.board.cards.find((c) => c.id === openCardId) ?? null;

  // Filter facet options are derived from the live cards, so they always
  // reflect the real board (demo or Supabase) — never a hardcoded list.
  const assigneeOptions = useMemo(
    () =>
      Array.from(
        new Set(board.board.cards.map((c) => c.assigneeName).filter((n): n is string => !!n)),
      ).sort(),
    [board.board.cards],
  );
  const customerOptions = useMemo(
    () =>
      Array.from(
        new Set(board.board.cards.map((c) => c.customer).filter((n): n is string => !!n)),
      ).sort(),
    [board.board.cards],
  );

  function toggle<K extends "assignees" | "customers">(key: K, value: string) {
    setFilters((f) => {
      const list = f[key];
      return {
        ...f,
        [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      };
    });
  }
  function togglePriority(value: string) {
    const p = value as CardPriority;
    setFilters((f) => ({
      ...f,
      priorities: f.priorities.includes(p)
        ? f.priorities.filter((v) => v !== p)
        : [...f.priorities, p],
    }));
  }
  function setDue(value: string) {
    setFilters((f) => ({ ...f, due: f.due === value ? null : (value as DueFilter) }));
  }

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
    (c) => c.dueDate && c.status !== "completed" && new Date(c.dueDate).getTime() < now,
  ).length;

  const filtered = isEmptyFilters(filters);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{board.board.projectTitle}</h2>
          <p className="text-sm tabular-nums text-muted-foreground">
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

      {/* Filter bar — narrows the visible cards client-side (local state only). */}
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <ListFilter className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <FilterMenu
          label="Assignee"
          options={assigneeOptions}
          selected={filters.assignees}
          onToggle={(v) => toggle("assignees", v)}
        />
        <FilterMenu
          label="Brand"
          options={customerOptions}
          selected={filters.customers}
          onToggle={(v) => toggle("customers", v)}
        />
        <FilterMenu
          label="Priority"
          options={PRIORITY_ORDER}
          selected={filters.priorities}
          onToggle={togglePriority}
          render={(p) => PRIORITY_LABEL[p as CardPriority]}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-md border border-dashed px-2.5 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filters.due
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground",
              )}
            >
              Due
              <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Due</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={filters.due ?? ""} onValueChange={setDue}>
              {DUE_OPTIONS.map((d) => (
                <DropdownMenuRadioItem key={d} value={d}>
                  {DUE_FILTER_LABEL[d]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {!filtered && (
          <>
            <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            {filters.assignees.map((a) => (
              <ActiveChip key={`a-${a}`} label={a} onRemove={() => toggle("assignees", a)} />
            ))}
            {filters.customers.map((c) => (
              <ActiveChip key={`c-${c}`} label={c} onRemove={() => toggle("customers", c)} />
            ))}
            {filters.priorities.map((p) => (
              <ActiveChip key={`p-${p}`} label={PRIORITY_LABEL[p]} onRemove={() => togglePriority(p)} />
            ))}
            {filters.due && (
              <ActiveChip
                label={DUE_FILTER_LABEL[filters.due]}
                onRemove={() => setFilters((f) => ({ ...f, due: null }))}
              />
            )}
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="ml-1 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear all
            </button>
          </>
        )}
      </div>

      <div className="flex flex-1 gap-3 overflow-x-auto pb-4">
        {buckets.map((bucket, i) => (
          <KanbanColumn
            key={bucket.id}
            bucket={bucket}
            index={i}
            count={buckets.length}
            cards={cardsInBucket(board.board, bucket.id).filter((c) => matchesFilters(c, filters, now))}
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
