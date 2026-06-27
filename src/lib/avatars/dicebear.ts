// Local, deterministic avatar/icon SVGs via DiceBear v9 (no runtime API key).
// createAvatar(...).toDataUri() is synchronous in v9. Ported from the owner's
// NexoString project (lib/avatars/dicebear.ts) and adapted for Vite/React.
// Pitfalls baked in: named style imports, backgroundColor hex WITHOUT '#'.

import { createAvatar, type Style } from "@dicebear/core";
import {
  notionistsNeutral,
  botttsNeutral,
  glass,
  shapes,
  icons,
} from "@dicebear/collection";

export type AvatarStyleKey = "person" | "bot" | "glass" | "shapes" | "icons";

// Each collection style has a different Options shape; widen to a common type so
// the lookup is usable with createAvatar (we only pass shared core options).
type AnyStyle = Style<Record<string, unknown>>;

const STYLES: Record<AvatarStyleKey, AnyStyle> = {
  person: notionistsNeutral as unknown as AnyStyle,
  bot: botttsNeutral as unknown as AnyStyle,
  glass: glass as unknown as AnyStyle,
  shapes: shapes as unknown as AnyStyle,
  icons: icons as unknown as AnyStyle,
};

// Soft, premium tints (hex, NO leading '#') so the line-art reads on a dark UI.
const SOFT_BG = [
  "a9f9e9", // cyan
  "afa7fb", // violet
  "fbe3a8", // gold
  "f9bcd0", // rose
  "b1f1d1", // mint
  "b8dcff", // azure
  "dcf3a8", // lime
  "f5cfa8", // bronze
  "e3b8f0", // orchid
];

function bgFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return SOFT_BG[h % SOFT_BG.length] as string;
}

/** Deterministic avatar data-URI for a seed. Synchronous. */
export function dicebearDataUri(
  seed: string,
  opts?: { style?: AvatarStyleKey; backgroundColor?: string },
): string {
  const style = STYLES[opts?.style ?? "person"];
  const bg = opts?.backgroundColor ?? bgFor(seed);
  return createAvatar(style, {
    seed,
    size: 96,
    radius: 18,
    backgroundColor: [bg],
    backgroundType: ["gradientLinear", "solid"],
    backgroundRotation: [0, 360],
  }).toDataUri();
}

/** A fixed gallery of generic presets for the avatar picker. */
export const AVATAR_PRESET_SEEDS: string[] = Array.from(
  { length: 24 },
  (_, i) => `premier-preset-${i + 1}`,
);
