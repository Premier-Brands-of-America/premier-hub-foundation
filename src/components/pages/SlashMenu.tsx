import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SLASH_COMMANDS, type SlashCommand } from "@/lib/slash-commands";

interface Props {
  open: boolean;
  query: string;
  onQueryChange: (v: string) => void;
  onSelect: (cmd: SlashCommand) => void;
  onClose: () => void;
  anchor?: { x: number; y: number };
}

export function SlashMenu({ open, query, onQueryChange, onSelect, onClose, anchor }: Props) {
  const q = query.trim().toLowerCase();
  const items = q
    ? SLASH_COMMANDS.filter(
        (c) => c.label.toLowerCase().includes(q) || c.keywords.some((k) => k.includes(q)),
      )
    : SLASH_COMMANDS;

  return (
    <Popover open={open} onOpenChange={(o) => !o && onClose()}>
      <PopoverTrigger asChild>
        <span
          className="fixed pointer-events-none"
          style={{ left: anchor?.x ?? 0, top: (anchor?.y ?? 0) + 4, width: 1, height: 1 }}
        />
      </PopoverTrigger>
      <PopoverContent className="p-0 w-72" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Filter blocks…" value={query} onValueChange={onQueryChange} autoFocus />
          <CommandList>
            <CommandEmpty>No blocks.</CommandEmpty>
            <CommandGroup heading="Insert">
              {items.map((c) => (
                <CommandItem key={c.id} value={c.id} onSelect={() => onSelect(c)} className="gap-2">
                  <c.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{c.label}</span>
                  <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">{c.hint}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
