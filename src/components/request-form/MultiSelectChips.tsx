import { cn } from "@/lib/utils";

interface MultiSelectChipsProps<T extends string> {
  options: readonly T[];
  value: T[];
  onChange: (next: T[]) => void;
  ariaLabel?: string;
}

export function MultiSelectChips<T extends string>({
  options, value, onChange, ariaLabel,
}: MultiSelectChipsProps<T>) {
  const toggle = (opt: T) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            type="button"
            key={opt}
            onClick={() => toggle(opt)}
            aria-pressed={active}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs border transition-colors",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted border-input text-foreground",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}