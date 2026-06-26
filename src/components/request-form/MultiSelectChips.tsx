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
              "rounded-full border px-3 py-1.5 text-xs transition-colors duration-fast",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              active
                ? "border-primary/40 bg-[hsl(var(--primary)/0.12)] font-medium text-primary"
                : "border-input bg-muted/40 text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}