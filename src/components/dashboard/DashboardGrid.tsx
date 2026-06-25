import { useRef, useState, type CSSProperties, type DragEvent } from "react";
import { LayoutGrid } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { getCardDefinition } from "./card-registry";
import { DashboardCard } from "./DashboardCard";
import { MAX_W, MIN_W, type DashboardWidget } from "./types";
import type { UseDashboardLayout } from "./useDashboardLayout";

interface DashboardGridProps {
  editing: boolean;
  layout: UseDashboardLayout;
  /** Slot rendered inside the empty state (e.g. the Add-card menu). */
  emptyAction?: React.ReactNode;
}

export function DashboardGrid({ editing, layout, emptyAction }: DashboardGridProps) {
  const { widgets } = layout;
  const dragFrom = useRef<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  if (widgets.length === 0) {
    return (
      <EmptyState
        icon={<LayoutGrid className="h-6 w-6" />}
        title="Your dashboard is empty"
        description={
          editing
            ? "Add a card to start building your dashboard."
            : "Switch to edit mode to add cards."
        }
        action={editing ? emptyAction : undefined}
      />
    );
  }

  const handleDragStart = (index: number, id: string) => (e: DragEvent) => {
    dragFrom.current = index;
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    // Required for Firefox to start the drag.
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragEnter = (index: number) => () => {
    const from = dragFrom.current;
    if (from === null || from === index) return;
    layout.moveByIndex(from, index);
    dragFrom.current = index; // dragged item now lives at the target index
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnd = () => {
    dragFrom.current = null;
    setDraggingId(null);
  };

  return (
    <div className="grid grid-cols-12 gap-4 auto-rows-[minmax(8.5rem,auto)]">
      {widgets.map((widget: DashboardWidget, index) => {
        const def = getCardDefinition(widget.type);
        const style = { "--cw": widget.w, "--rh": widget.h } as CSSProperties;
        return (
          <div
            key={widget.id}
            style={style}
            className="col-span-12 md:[grid-column:span_var(--cw)] [grid-row:span_var(--rh)]"
            draggable={editing}
            onDragStart={editing ? handleDragStart(index, widget.id) : undefined}
            onDragEnter={editing ? handleDragEnter(index) : undefined}
            onDragOver={editing ? handleDragOver : undefined}
            onDragEnd={editing ? handleDragEnd : undefined}
          >
            <DashboardCard
              title={widget.config.title ?? def.title}
              icon={def.icon}
              editing={editing}
              isFirst={index === 0}
              isLast={index === widgets.length - 1}
              canGrow={widget.w < MAX_W}
              canShrink={widget.w > MIN_W}
              isDragging={draggingId === widget.id}
              onRemove={() => layout.removeCard(widget.id)}
              onMovePrev={() => layout.nudge(widget.id, "prev")}
              onMoveNext={() => layout.nudge(widget.id, "next")}
              onGrow={() => layout.grow(widget.id)}
              onShrink={() => layout.shrink(widget.id)}
            >
              {def.render(widget.config)}
            </DashboardCard>
          </div>
        );
      })}
    </div>
  );
}
