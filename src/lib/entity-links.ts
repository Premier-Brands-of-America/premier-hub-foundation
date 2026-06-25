import type { EntityType } from "@/types/relations";

/**
 * Canonical wikilink token format, locked to match the server-side
 * `extract_page_links()` trigger (see the pages migration). The type set and
 * 36-char uuid are required — never embed display text inside the brackets, or
 * the trigger will skip the link and backlinks will silently break.
 */
export const MENTION_TOKEN_RE =
  /\[\[(page|project|task|request|user):([0-9a-fA-F-]{36})\]\]/g;

/** Build a `[[type:id]]` token (trailing space added by callers as needed). */
export function mentionToken(type: EntityType, id: string): string {
  return `[[${type}:${id}]]`;
}

/** Unique list of entity refs referenced by a markdown body. */
export function parseMentionRefs(md: string): Array<{ type: EntityType; id: string }> {
  const seen = new Set<string>();
  const refs: Array<{ type: EntityType; id: string }> = [];
  const re = new RegExp(MENTION_TOKEN_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) {
    const key = `${m[1]}:${m[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({ type: m[1] as EntityType, id: m[2] });
    }
  }
  return refs;
}

/**
 * Best-effort route for an entity. Tasks and projects open via in-page panels
 * rather than a dedicated `/:id` route, so we land on their list view; users
 * and departments have no destination and render as non-clickable chips.
 */
export function entityHref(type: EntityType, id: string): string | null {
  switch (type) {
    case "page":
      return `/pages/${id}`;
    case "request":
      return `/requests/${id}`;
    case "task":
      return "/tasks";
    case "project":
      return "/owned-projects";
    default:
      return null;
  }
}
