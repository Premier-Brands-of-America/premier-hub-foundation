import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CARD_REGISTRY, CARD_TYPES } from "./card-registry";
import type { CardType } from "./types";

export function AddCardMenu({ onAdd }: { onAdd: (type: CardType) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="h-3.5 w-3.5" />
          Add card
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Add a card</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CARD_TYPES.map((type) => {
          const def = CARD_REGISTRY[type];
          const Icon = def.icon;
          return (
            <DropdownMenuItem
              key={type}
              onSelect={() => onAdd(type)}
              className="flex items-start gap-2.5 py-2"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{def.title}</p>
                <p className="truncate text-xs text-muted-foreground">{def.description}</p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
