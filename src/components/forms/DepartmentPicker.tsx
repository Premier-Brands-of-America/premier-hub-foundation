import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useActiveDepartments, fetchDepartmentById, type DepartmentRow } from "@/hooks/useDepartments";

interface Props {
  value?: string | null;
  onChange: (id: string) => void;
  includeInactive?: boolean;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  ariaLabel?: string;
}

export function DepartmentPicker({
  value, onChange, disabled, required, id, ariaLabel,
}: Props) {
  const { data: active = [], isLoading } = useActiveDepartments();

  // If current value is an inactive department, fetch it as fallback option
  const { data: fallback } = useQuery({
    queryKey: ["departments", "fallback", value],
    queryFn: () => fetchDepartmentById(value as string),
    enabled: Boolean(value) && !active.some((d) => d.id === value),
  });

  const options: DepartmentRow[] = useMemo(() => {
    const list = [...active];
    if (fallback && !list.some((d) => d.id === fallback.id)) {
      list.push({ ...fallback, name: fallback.is_active ? fallback.name : `${fallback.name} (inactive)` });
    }
    return list;
  }, [active, fallback]);

  const useCombobox = options.length > 10;
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  if (isLoading) {
    return <div className="text-xs text-muted-foreground py-2">Loading departments...</div>;
  }
  if (options.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-2">
        No departments available — contact admin
      </div>
    );
  }

  if (!useCombobox) {
    return (
      <Select value={value ?? ""} onValueChange={onChange} disabled={disabled} required={required}>
        <SelectTrigger id={id} aria-label={ariaLabel ?? "Department"}>
          <SelectValue placeholder="Select department" />
        </SelectTrigger>
        <SelectContent>
          {options.map((d) => (
            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-label={ariaLabel ?? "Department"}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected?.name ?? "Select department"}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search department..." />
          <CommandList>
            <CommandEmpty>No match.</CommandEmpty>
            <CommandGroup>
              {options.map((d) => (
                <CommandItem
                  key={d.id}
                  value={d.name}
                  onSelect={() => { onChange(d.id); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === d.id ? "opacity-100" : "opacity-0")} />
                  {d.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}