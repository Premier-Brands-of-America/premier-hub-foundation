/**
 * @mention parsing for comments / activity threads.
 *
 * Supports two syntaxes:
 *  - `@[Display Name](user-id)`  — explicit, produced by the mention picker
 *  - `@handle`                   — loose, resolved against a directory later
 *
 * The explicit form is authoritative for notifications (carries the user id).
 */

export interface Mention {
  userId: string;
  display: string;
}

const EXPLICIT = /@\[([^\]]+)\]\(([^)]+)\)/g;
const LOOSE = /(^|\s)@([a-z0-9._-]{2,})/gi;

/** Extract explicit `@[Name](id)` mentions (deduped by userId). */
export function parseMentions(text: string): Mention[] {
  const out = new Map<string, Mention>();
  if (!text) return [];
  let m: RegExpExecArray | null;
  EXPLICIT.lastIndex = 0;
  while ((m = EXPLICIT.exec(text)) !== null) {
    const display = m[1].trim();
    const userId = m[2].trim();
    if (userId) out.set(userId, { userId, display });
  }
  return [...out.values()];
}

/** Extract loose `@handle` tokens (without ids) for directory resolution. */
export function parseLooseHandles(text: string): string[] {
  const out = new Set<string>();
  if (!text) return [];
  let m: RegExpExecArray | null;
  LOOSE.lastIndex = 0;
  while ((m = LOOSE.exec(text)) !== null) {
    out.add(m[2].toLowerCase());
  }
  return [...out];
}

/** Render explicit mentions to plain text (`@Name`) for previews/notifications. */
export function mentionsToPlainText(text: string): string {
  if (!text) return "";
  return text.replace(EXPLICIT, (_all, display) => `@${String(display).trim()}`);
}

/** Insert an explicit mention token at a caret position. */
export function insertMention(
  text: string,
  caret: number,
  mention: Mention,
): { text: string; caret: number } {
  // Replace a trailing "@partial" before the caret, if present.
  const before = text.slice(0, caret);
  const after = text.slice(caret);
  const at = before.lastIndexOf("@");
  const token = `@[${mention.display}](${mention.userId}) `;
  if (at === -1) {
    return { text: before + token + after, caret: caret + token.length };
  }
  const head = before.slice(0, at);
  return { text: head + token + after, caret: head.length + token.length };
}
