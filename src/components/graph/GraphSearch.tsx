import { useMemo, useState } from "react";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { EntityIcon } from "@/components/common/EntityIcon";
import type { GraphNode } from "@/types/graph";

interface Props {
  nodes: GraphNode[];
  onSelect: (n: GraphNode) => void;
}

export function GraphSearch({ nodes, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return nodes.slice(0, 50);
    return nodes.filter((n) => n.label?.toLowerCase().includes(term)).slice(0, 50);
  }, [q, nodes]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          Search nodes
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search…" value={q} onValueChange={setQ} />
          <CommandList>
            <CommandEmpty>No nodes found.</CommandEmpty>
            <CommandGroup>
              {matches.map((n) => (
                <CommandItem
                  key={n.id}
                  value={n.id}
                  onSelect={() => {
                    onSelect(n);
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  <EntityIcon type={n.type} className="h-4 w-4" />
                  <span className="truncate">{n.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{n.type}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}