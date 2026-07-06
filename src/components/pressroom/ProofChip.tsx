import { cn } from "@/lib/utils";
import { PROOF_META, type ProofState } from "./proofState";

/**
 * The unified status chip: a colored dot + label. One grammar everywhere.
 * `size="sm"` for dense rows, `size="md"` for detail headers.
 */
export function ProofChip({
  state,
  size = "sm",
  className,
}: {
  state: ProofState;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = PROOF_META[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className,
      )}
      style={{
        backgroundColor: `hsl(var(${meta.token}) / 0.14)`,
        color: `hsl(var(${meta.token}))`,
      }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: `hsl(var(${meta.token}))` }}
        aria-hidden
      />
      {meta.label}
    </span>
  );
}
