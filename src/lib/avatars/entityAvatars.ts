// Maps Premier Hub entities to deterministic DiceBear avatar/icon data-URIs and
// to their design-system hue token, so a person renders a portrait and a
// project/task renders an icon — both inside graph nodes and on cards.

import type { NodeType } from "@/types/graph";
import { dicebearDataUri, type AvatarStyleKey } from "./dicebear";

/** Default DiceBear style per entity type. People get portraits; everything
 *  else gets a seeded glyph/shape so it reads as an icon, not a face. */
const STYLE_BY_TYPE: Record<NodeType, AvatarStyleKey> = {
  user: "person",
  project: "shapes",
  task: "icons",
  request: "icons",
  department: "shapes",
  page: "glass",
  concept: "shapes",
};

/** CSS hue token per entity type (mirrors graph node colors). */
export const HUE_VAR_BY_TYPE: Record<NodeType, string> = {
  project: "--entity-project",
  task: "--entity-task",
  request: "--entity-request",
  page: "--entity-page",
  user: "--entity-person",
  department: "--entity-department",
  concept: "--entity-concept",
};

/** Resolve an entity's image data-URI. An explicit avatar_url/icon (real
 *  uploaded photo or chosen icon) always wins; otherwise a deterministic
 *  DiceBear default is generated from the seed. */
export function entityImageUri(
  type: NodeType,
  seed: string,
  explicit?: string | null,
): string {
  if (explicit) return explicit;
  return dicebearDataUri(seed || type, { style: STYLE_BY_TYPE[type] });
}

/** Person/user avatar — DiceBear "person" default unless a real photo is set. */
export function userAvatarUri(seedOrId: string, explicit?: string | null): string {
  if (explicit) return explicit;
  return dicebearDataUri(seedOrId || "user", { style: "person" });
}
