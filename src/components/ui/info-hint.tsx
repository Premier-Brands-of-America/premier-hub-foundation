import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * InfoHint — the app-wide contextual-help affordance: a small "?" icon that,
 * on hover OR keyboard focus, explains a term, a metric, or how a number is
 * calculated. Use it anywhere a label carries jargon or a computed value.
 *
 * Accessible by design: the trigger is a real focusable button with an aria
 * label, and TooltipProvider (mounted globally in App.tsx) opens it on focus
 * too — not hover-only. Keep the copy plain-language; pull shared wording from
 * `@/lib/glossary` so the same term reads the same everywhere.
 */
export function InfoHint({
  children,
  title,
  side = "top",
  size = 13,
  className,
  label = "More information",
}: {
  /** Rich explanation. Provide either children or (title + string body via children). */
  children: React.ReactNode;
  /** Optional bold heading above the body. */
  title?: string;
  side?: "top" | "right" | "bottom" | "left";
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
          // Don't let the hint trigger a parent row/card click.
          onClick={(e) => e.stopPropagation()}
        >
          <HelpCircle style={{ width: size, height: size }} aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[17rem] text-left text-xs leading-relaxed">
        {title && <p className="mb-1 font-semibold text-foreground">{title}</p>}
        <div className="text-muted-foreground [&_b]:font-semibold [&_b]:text-foreground">{children}</div>
      </TooltipContent>
    </Tooltip>
  );
}
