/**
 * EntityAvatar — the card-surface render primitive for avatars/icons.
 * Built on the shadcn Avatar; given an entity type + seed (and optional real
 * photo / chosen icon), it renders the DiceBear default with a hue-tinted ring
 * — a person shows a portrait, a project/task shows a seeded icon. Mirrors the
 * glow language of the graph nodes so cards and the constellation feel like one
 * system (NexoString NeuronAvatar approach).
 */
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { NodeType } from "@/types/graph";
import { entityImageUri, HUE_VAR_BY_TYPE } from "@/lib/avatars/entityAvatars";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const BOX: Record<Size, string> = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-14 w-14",
};
const TEXT: Record<Size, string> = {
  xs: "text-[8px]",
  sm: "text-[10px]",
  md: "text-[11px]",
  lg: "text-xs",
  xl: "text-sm",
};

function initials(name?: string | null): string {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

export function EntityAvatar({
  type,
  seed,
  name,
  src,
  size = "md",
  glow = false,
  shape,
  className,
}: {
  type: NodeType;
  /** Stable id/seed for the deterministic default. */
  seed: string;
  /** Display name — used for the fallback initials + alt text. */
  name?: string | null;
  /** Explicit avatar_url / chosen icon — wins over the default. */
  src?: string | null;
  size?: Size;
  glow?: boolean;
  /** circle for people, rounded for projects/tasks (defaulted by type). */
  shape?: "circle" | "rounded";
  className?: string;
}) {
  const uri = entityImageUri(type, seed, src);
  const hueVar = HUE_VAR_BY_TYPE[type];
  const isCircle = (shape ?? (type === "user" ? "circle" : "rounded")) === "circle";
  const radius = isCircle ? "rounded-full" : "rounded-md";

  return (
    <Avatar
      className={cn(BOX[size], radius, className)}
      style={{
        ["--neuron-color" as string]: `var(${hueVar})`,
        boxShadow: glow
          ? `inset 0 0 0 1px hsl(var(${hueVar}) / 0.5), 0 0 14px -2px hsl(var(${hueVar}) / 0.5)`
          : `inset 0 0 0 1px hsl(var(${hueVar}) / 0.4)`,
      }}
    >
      <AvatarImage src={uri} alt={name ?? ""} className={radius} />
      <AvatarFallback
        className={cn(radius, TEXT[size], "font-medium")}
        style={{ background: `hsl(var(${hueVar}) / 0.16)`, color: `hsl(var(${hueVar}))` }}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
