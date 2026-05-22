import { useEffect, useMemo, useState } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { EntityIcon } from "@/components/common/EntityIcon";
import { searchEntities } from "@/services/relationsService";
import type { EntityType, RelationRef } from "@/types/relations";

interface Props {
  entityTypes: EntityType[];
  value?: RelationRef | RelationRef[];
  onChange: (v: RelationRef | RelationRef[]) => void;
  multiple?: boolean;
  excludeIds?: string[];
  placeholder?: string;
}

const TYPE_LABEL: Record<EntityType, string> = {
  project: "Projects",
  task: "Tasks",
  request: "Requests",
  page: "Pages",
  user: "People",
  department: "Departments",
};

export function RelationPicker({
  entityTypes,
  value,
  onChange,
  multiple,
  excludeIds = [],
  placeholder = "Link an item…",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RelationRef[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const r = await searchEntities(query, entityTypes, 20);
        setResults(r.filter((x) => !excludeIds.includes(x.entityId)));
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open, entityTypes, excludeIds]);

  const grouped = useMemo(() => {
    const m = new Map<EntityType, RelationRef[]>();
    for (const r of results) {
      if (!m.has(r.entityType)) m.set(r.entityType, []);
      m.get(r.entityType)!.push(r);
    }
    return m;
  }, [results]);

  const selectedArray: RelationRef[] = Array.isArray(value) ? value : value ? [value] : [];

  const handlePick = (ref: RelationRef) => {
    if (multiple) {
      onChange([...selectedArray, ref]);
    } else {
      onChange(ref);
      setOpen(false);
    }
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-dashed text-xs font-normal text-muted-foreground"
        >
          <Link2 className="h-3.5 w-3.5" />
          {placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search projects, tasks, requests…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && <div className="px-2 py-3 text-xs text-muted-foreground">Searching…</div>}
            {!loading && results.length === 0 && (
              <CommandEmpty>
                {query.trim() ? "No matches." : "Type to search."}
              </CommandEmpty>
            )}
            {[...grouped.entries()].map(([type, items]) => (
              <CommandGroup key={type} heading={TYPE_LABEL[type]}>
                {items.map((item) => (
                  <CommandItem
                    key={`${item.entityType}:${item.entityId}`}
                    value={`${item.entityType}:${item.entityId}:${item.title}`}
                    onSelect={() => handlePick(item)}
                  >
                    <EntityIcon type={item.entityType} className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{item.title}</span>
                    {item.subtitle && (
                      <span className="ml-2 truncate text-xs text-muted-foreground">{item.subtitle}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}