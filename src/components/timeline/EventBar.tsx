import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getEventColorVar } from "./eventColors";
import type { ColorBy, TimelineEvent } from "@/types/timeline";

interface Props {
  event: TimelineEvent;
  colorBy: ColorBy;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  draggable?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export function EventBar({
  event, colorBy, onClick, className, style, draggable, onPointerDown,
}: Props) {
  const colorVar = getEventColorVar(event, colorBy);
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`${event.entity_type}: ${event.title}`}
            onClick={onClick}
            onPointerDown={onPointerDown}
            className={cn(
              "flex h-6 items-center gap-1.5 rounded-md border px-2 text-xs font-medium truncate text-left",
              "transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
              className,
            )}
            style={{
              backgroundColor: `hsl(var(${colorVar}) / 0.16)`,
              borderColor: `hsl(var(${colorVar}) / 0.42)`,
              color: `hsl(var(${colorVar}))`,
              ...style,
            }}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: `hsl(var(${colorVar}))` }}
              aria-hidden
            />
            <span className="truncate">{event.title}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-0.5">
            <p className="font-medium">{event.title}</p>
            <p className="text-xs opacity-80">
              {event.entity_type} · {event.start_date}
              {event.end_date && event.end_date !== event.start_date ? ` → ${event.end_date}` : ""}
            </p>
            {event.status && <p className="text-xs opacity-80">Status: {event.status}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}