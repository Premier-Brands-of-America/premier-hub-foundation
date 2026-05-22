import { useEffect, useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EntityIcon } from "@/components/common/EntityIcon";
import { searchEntities, searchPages } from "@/services/relationsService";
import type { RelationRef } from "@/types/relations";

interface Props {
  open: boolean;
  query: string;
  onQueryChange: (v: string) => void;
  onSelect: (ref: RelationRef) => void;
  onClose: () => void;
  anchor?: { x: number; y: number };
}

export function MentionPicker({ open, query, onQueryChange, onSelect, onClose, anchor }: Props) {
  const [results, setResults] = useState<RelationRef[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!open) return;
    (async () => {
      const [common, pages] = await Promise.all([
        searchEntities(query, ["project", "task", "request"], 8),
        searchPages(query, 8),
      ]);
      if (!cancelled) setResults([...pages, ...common]);
    })();
    return () => { cancelled = true; };
  }, [open, query]);

  return (
    <Popover open={open} onOpenChange={(o) => !o && onClose()}>
      <PopoverTrigger asChild>
        <span
          className="fixed pointer-events-none"
          style={{ left: anchor?.x ?? 0, top: (anchor?.y ?? 0) + 4, width: 1, height: 1 }}
        />
      </PopoverTrigger>
      <PopoverContent className="p-0 w-80" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search pages, tasks, projects, requests…" value={query} onValueChange={onQueryChange} autoFocus />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {results.map((r) => (
                <CommandItem key={`${r.entityType}-${r.entityId}`} onSelect={() => onSelect(r)}>
                  <EntityIcon type={r.entityType} className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{r.title}</span>
                  {r.subtitle && <span className="ml-auto text-xs text-muted-foreground">{r.subtitle}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}