/**
 * Block model for the single formatted Pages surface.
 *
 * Pages persist a **markdown string** (`body_md`) and a Postgres trigger scans
 * that string for `[[type:id]]` tokens. The editor is therefore markdown-native:
 * we never introduce a block-JSON document. Instead we split `body_md` into an
 * ordered list of *source blocks* purely for editing (click-to-edit-in-place),
 * and reassemble the exact markdown on every change.
 *
 * Round-trip contract (covered by page-blocks.test.ts):
 *   joinBlocks(splitIntoBlocks(md)) === md   (modulo normalized trailing space)
 *
 * The `meet` / `view` fenced blocks are kept intact as single blocks so they are
 * never split mid-fence, and are rendered by their custom components.
 */

export type BlockKind = "md" | "meet" | "view";

export interface Block {
  /** Stable id so React keys and the +/edit controls survive re-splitting. */
  id: string;
  kind: BlockKind;
  /** The block's own markdown source (no surrounding blank lines). */
  src: string;
}

/** Matches a whole ```view / ```meet fenced block (kept as one block). */
const FENCE_RE = /```(view|meet)\n([\s\S]*?)```/g;

let idSeq = 0;
function nextId(): string {
  idSeq += 1;
  return `blk-${idSeq}`;
}

/**
 * Split a markdown body into editable source blocks.
 *
 * - `meet` / `view` fences become one block each (kind reflects the fence).
 * - Everything else is split on blank lines into paragraph-ish blocks, but a
 *   fenced code block (```lang … ```) and its body are kept together so we never
 *   break a multi-line block on the blank lines inside it.
 *
 * An empty / whitespace-only body yields a single empty `md` block so the
 * surface always has one place to start typing.
 */
export function splitIntoBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  const source = md ?? "";

  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(FENCE_RE.source, "g");
  while ((m = re.exec(source))) {
    if (m.index > last) {
      pushMarkdownSegment(source.slice(last, m.index), blocks);
    }
    blocks.push({ id: nextId(), kind: m[1] === "view" ? "view" : "meet", src: m[0] });
    last = m.index + m[0].length;
  }
  if (last < source.length) {
    pushMarkdownSegment(source.slice(last), blocks);
  }

  if (blocks.length === 0) blocks.push({ id: nextId(), kind: "md", src: "" });
  return blocks;
}

/**
 * Split a run of ordinary markdown (no meet/view fences) into blocks on blank
 * lines, keeping ordinary fenced code blocks whole.
 */
function pushMarkdownSegment(segment: string, out: Block[]): void {
  const lines = segment.split("\n");
  let buf: string[] = [];
  let inFence = false;

  const flush = () => {
    // Drop leading/trailing blank lines that only came from block separation.
    while (buf.length && buf[0].trim() === "") buf.shift();
    while (buf.length && buf[buf.length - 1].trim() === "") buf.pop();
    if (buf.length) out.push({ id: nextId(), kind: "md", src: buf.join("\n") });
    buf = [];
  };

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      buf.push(line);
      continue;
    }
    if (!inFence && line.trim() === "") {
      flush();
      continue;
    }
    buf.push(line);
  }
  flush();
}

/**
 * Reassemble the markdown body from blocks. Blocks are separated by a blank
 * line (`\n\n`) — the CommonMark boundary the split relied on — so the round
 * trip is stable. Empty blocks are dropped from the persisted string (an empty
 * block is an editing affordance, not content), except we always emit at least
 * an empty string.
 */
export function joinBlocks(blocks: Block[]): string {
  return blocks
    .map((b) => b.src.replace(/\s+$/g, "")) // trim trailing whitespace per block
    .filter((src) => src.length > 0)
    .join("\n\n");
}

/**
 * A coarse classification of a markdown block's leading token — used only for
 * placeholder text and the block menu's "Turn into" affordance, never to change
 * how it renders (react-markdown owns rendering).
 */
export type BlockType =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "numbered"
  | "todo"
  | "quote"
  | "callout"
  | "code"
  | "divider";

export function classifyBlock(src: string): BlockType {
  const line = src.trimStart();
  if (/^```/.test(line)) return "code";
  if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) return "divider";
  if (/^#\s/.test(line)) return "h1";
  if (/^##\s/.test(line)) return "h2";
  if (/^###\s/.test(line)) return "h3";
  if (/^[-*]\s+\[[ xX]\]\s/.test(line)) return "todo";
  if (/^[-*+]\s/.test(line)) return "bullet";
  if (/^\d+\.\s/.test(line)) return "numbered";
  // A blockquote that opens with an emoji reads as a callout.
  if (/^>\s*\p{Extended_Pictographic}/u.test(line)) return "callout";
  if (/^>\s/.test(line)) return "quote";
  return "paragraph";
}

/**
 * Rewrite a block's leading markdown token to a new type ("Turn into").
 * Operates on the first line only and preserves the existing text content.
 */
export function turnInto(src: string, type: BlockType): string {
  const lines = src.split("\n");
  const first = lines[0] ?? "";
  // Strip any existing leading block token from the first line.
  const bare = first
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*+]\s+\[[ xX]\]\s+/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/^>\s?/, "");

  let prefix = "";
  switch (type) {
    case "h1": prefix = "# "; break;
    case "h2": prefix = "## "; break;
    case "h3": prefix = "### "; break;
    case "bullet": prefix = "- "; break;
    case "numbered": prefix = "1. "; break;
    case "todo": prefix = "- [ ] "; break;
    case "quote": prefix = "> "; break;
    case "callout": prefix = "> 💡 "; break;
    case "divider": return "---";
    case "code": return "```\n" + src + "\n```";
    case "paragraph":
    default: prefix = ""; break;
  }
  lines[0] = prefix + bare;
  return lines.join("\n");
}

/**
 * Toggle the checkbox state of the first to-do line in a block's markdown.
 * Returns the block source unchanged if it is not a to-do.
 */
export function toggleTodo(src: string): string {
  return src.replace(/^(\s*[-*+]\s+)\[([ xX])\]/m, (_full, lead: string, mark: string) =>
    `${lead}[${mark.trim() === "" ? "x" : " "}]`,
  );
}

/** Is this markdown block an interactive to-do (single checkbox line)? */
export function isTodoBlock(src: string): boolean {
  return /^\s*[-*+]\s+\[[ xX]\]\s/.test(src.trimStart());
}

/** A short placeholder shown when a freshly-created block is empty. */
export function placeholderFor(type: BlockType): string {
  switch (type) {
    case "h1": return "Heading 1";
    case "h2": return "Heading 2";
    case "h3": return "Heading 3";
    case "bullet": return "List item";
    case "numbered": return "List item";
    case "todo": return "To-do";
    case "quote": return "Quote";
    case "callout": return "Callout";
    default: return "Write, or press / for blocks · [[ to link";
  }
}
