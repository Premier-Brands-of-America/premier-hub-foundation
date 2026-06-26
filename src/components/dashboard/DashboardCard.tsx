import type { ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  icon: LucideIcon;
  editing: boolean;
  isFirst: boolean;
  isLast: boolean;
  canGrow: boolean;
  canShrink: boolean;
  isDragging: boolean;
  onRemove: () => void;
  onMovePrev: () => void;
  onMoveNext: () => void;
  onGrow: () => void;
  onShrink: () => void;
  children: ReactNode;
}

function CtrlButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  destructive,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            "h-6 w-6 text-muted-foreground hover:text-foreground",
            destructive && "hover:text-destructive",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function DashboardCard({
  title,
  icon: Icon,
  editing,
  isFirst,
  isLast,
  canGrow,
  canShrink,
  isDragging,
  onRemove,
  onMovePrev,
  onMoveNext,
  onGrow,
  onShrink,
  children,
}: DashboardCardProps) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col overflow-hidden transition-shadow",
        editing && "cursor-grab",
        isDragging && "opacity-50 ring-2 ring-ring ring-offset-2 ring-offset-background",
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        {editing && (
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <h3 className="flex-1 truncate text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h3>

        {editing && (
          <div className="flex items-center gap-0.5">
            <CtrlButton label="Move left" icon={ChevronLeft} onClick={onMovePrev} disabled={isFirst} />
            <CtrlButton label="Move right" icon={ChevronRight} onClick={onMoveNext} disabled={isLast} />
            <CtrlButton label="Narrower" icon={Minimize2} onClick={onShrink} disabled={!canShrink} />
            <CtrlButton label="Wider" icon={Maximize2} onClick={onGrow} disabled={!canGrow} />
            <CtrlButton label="Remove card" icon={X} onClick={onRemove} destructive />
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4 text-sm text-muted-foreground">
        {children}
      </div>
    </Card>
  );
}
