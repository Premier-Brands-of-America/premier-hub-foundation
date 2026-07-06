import { cn } from "@/lib/utils";

/**
 * Press Room signature motifs — the print-shop vocabulary that makes this app
 * unmistakably Premier's and unlike any generic dashboard: the CMYK color bar,
 * the registration crosshair, crop-mark corners, and the rubber proof stamp.
 * All token-driven; the register hues are pinned in both themes.
 */

/**
 * The color bar — the calibration strip printed along the edge of a press
 * sheet. Our signature accent: a thin run of register blocks + the crimson ink.
 * Drop it under the app header or atop a hero card.
 */
export function ColorBar({
  className,
  height = 3,
}: {
  className?: string;
  height?: number;
}) {
  const blocks = [
    "var(--register-c)",
    "var(--register-m)",
    "var(--register-y)",
    "var(--register-k)",
    "var(--primary)",
  ];
  return (
    <div
      className={cn("flex w-full overflow-hidden", className)}
      style={{ height }}
      aria-hidden
    >
      {blocks.map((v, i) => (
        <span key={i} className="h-full flex-1" style={{ backgroundColor: `hsl(${v})` }} />
      ))}
    </div>
  );
}

/**
 * Registration mark — the crosshair-in-circle printers use to align plates.
 * Static by default; `spinning` turns it into a loading indicator that feels
 * authored by a press, not a generic ring spinner.
 */
export function RegistrationMark({
  size = 20,
  className,
  spinning = false,
  strokeToken = "--muted-foreground",
}: {
  size?: number;
  className?: string;
  spinning?: boolean;
  strokeToken?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn(spinning && "animate-spin", className)}
      style={{ color: `hsl(var(${strokeToken}))`, animationDuration: spinning ? "1.6s" : undefined }}
      aria-hidden
    >
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <line x1="12" y1="0" x2="12" y2="24" stroke="currentColor" strokeWidth="1" />
      <line x1="0" y1="12" x2="24" y2="12" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/**
 * Crop-mark corners — wraps a featured element in the trim marks that frame a
 * print layout. Purely decorative framing for hero cards / the login panel.
 */
export function CropFrame({
  children,
  className,
  tone = "--border",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: string;
}) {
  const color = `hsl(var(${tone}))`;
  const mark = "before:absolute after:absolute before:block after:block";
  return (
    <div className={cn("relative", className)}>
      {/* four L-shaped crop marks, one per corner */}
      {(
        [
          "left-[-6px] top-[-6px] border-l border-t",
          "right-[-6px] top-[-6px] border-r border-t",
          "left-[-6px] bottom-[-6px] border-l border-b",
          "right-[-6px] bottom-[-6px] border-r border-b",
        ] as const
      ).map((pos, i) => (
        <span
          key={i}
          className={cn("pointer-events-none absolute h-2.5 w-2.5", pos)}
          style={{ borderColor: color }}
          aria-hidden
        />
      ))}
      {children}
    </div>
  );
}

/**
 * Proof stamp — a headline status rendered like an inked rubber stamp
 * (outlined, uppercase, letter-spaced, slightly rotated). For the one loud
 * status on a detail/hero surface — NOT for dense rows (use ProofChip there).
 */
export function ProofStamp({
  label,
  token = "--status-danger",
  className,
}: {
  label: string;
  token?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex -rotate-[4deg] select-none items-center rounded-[3px] border-2 px-2.5 py-1",
        "font-display text-[13px] font-semibold uppercase tracking-[0.14em]",
        className,
      )}
      style={{
        color: `hsl(var(${token}))`,
        borderColor: `hsl(var(${token}) / 0.7)`,
        backgroundColor: `hsl(var(${token}) / 0.06)`,
      }}
    >
      {label}
    </span>
  );
}
