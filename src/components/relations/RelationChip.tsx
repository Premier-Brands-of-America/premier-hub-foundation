import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EntityIcon } from "@/components/common/EntityIcon";
import { cn } from "@/lib/utils";
import type { RelationRef } from "@/types/relations";

interface Props {
  ref_: RelationRef;
  size?: "sm" | "md";
  onRemove?: () => void;
  onClick?: () => void;
}

export function RelationChip({ ref_, size = "md", onRemove, onClick }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-normal max-w-full",
        size === "sm" ? "h-6 text-xs px-1.5" : "h-7 text-xs px-2",
        onClick && "cursor-pointer hover:bg-accent/10",
      )}
      onClick={onClick}
    >
      <EntityIcon type={ref_.entityType} className="h-3 w-3 shrink-0" />
      <span className="truncate">{ref_.title}</span>
      {ref_.subtitle && <span className="text-muted-foreground truncate">· {ref_.subtitle}</span>}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${ref_.title}`}
          className="ml-0.5 -mr-0.5 rounded-sm hover:bg-muted-foreground/10 p-0.5"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}