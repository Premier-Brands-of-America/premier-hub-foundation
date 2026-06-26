import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { ReactNode } from "react";

interface RepeatableListProps<T> {
  label: string;
  items: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  renderItem: (index: number) => ReactNode;
  addLabel?: string;
  emptyText?: string;
}

export function RepeatableList<T>({
  label, items, onAdd, onRemove, renderItem,
  addLabel = "Add", emptyText = "None added yet.",
}: RepeatableListProps<T>) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <Button type="button" variant="outline" size="sm" onClick={onAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> {addLabel}
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-3 text-center text-xs text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((_, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 rounded-md border border-border bg-muted/20 p-2.5"
            >
              <div className="flex-1">{renderItem(idx)}</div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemove(idx)}
                aria-label="Remove"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}