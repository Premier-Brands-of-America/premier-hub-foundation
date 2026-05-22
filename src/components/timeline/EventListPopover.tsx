import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EventBar } from "./EventBar";
import type { ColorBy, TimelineEvent } from "@/types/timeline";

interface Props {
  trigger: React.ReactNode;
  events: TimelineEvent[];
  colorBy: ColorBy;
  onEventClick: (e: TimelineEvent) => void;
}

export function EventListPopover({ trigger, events, colorBy, onEventClick }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-64 p-2 space-y-1" align="start">
        {events.map((e) => (
          <EventBar
            key={`${e.entity_type}-${e.id}`}
            event={e}
            colorBy={colorBy}
            onClick={() => onEventClick(e)}
            className="w-full"
          />
        ))}
      </PopoverContent>
    </Popover>
  );
}