import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Lightbulb } from "lucide-react";
import { MentionPicker } from "@/components/pages/MentionPicker";
import { SlashMenu } from "@/components/pages/SlashMenu";
import { MentionLink } from "@/components/pages/MentionLink";
import { LinkedViewBlock } from "@/components/pages/LinkedViewBlock";
import { MeetingBlock } from "@/components/pages/MeetingBlock";
import { Checkbox } from "@/components/ui/checkbox";
import { useEntityTitles } from "@/hooks/use-entity-titles";
import { MENTION_TOKEN_RE, mentionToken, parseMentionRefs } from "@/lib/entity-links";
import { slashInsertion, type SlashCommand } from "@/lib/slash-commands";
import {
  classifyBlock,
  isTodoBlock,
  joinBlocks,
  placeholderFor,
  splitIntoBlocks,
  toggleTodo,
  type Block,
} from "@/lib/page-blocks";
import type { RelationRef, EntityType } from "@/types/relations";
import { cn } from "@/lib/utils";
import { caretCoordinates } from "@/lib/caret-coordinates";

interface Props {
  pageId: string;
  initialContent: string;
  onChange: (md: string) => void;
  readOnly?: boolean;
}

type MenuKind = "mention" | "wikilink" | "slash";
interface MenuState {
  kind: MenuKind;
  /** index of the trigger's first char within the ACTIVE block's src */
  start: number;
  /** caret index just after the trigger, within the active block's src */
  end: number;
}

const AUTOSAVE_MS = 800;

export function PageEditor({ pageId, initialContent, onChange, readOnly }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(() => splitIntoBlocks(initialContent));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [menuQuery, setMenuQuery] = useState("");
  const [anchor, setAnchor] = useState<{ x: number; y: number } | undefined>();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<number>();
  const lastSavedRef = useRef<string>(initialContent);
  // Focus/caret intent to apply after a state change (block create/merge).
  const focusIntent = useRef<{ id: string; caret: number } | null>(null);
  // Guard against clobbering in-progress edits when a realtime refetch arrives.
  const dirtyRef = useRef(false);

  const value = useMemo(() => joinBlocks(blocks), [blocks]);

  // Reset ONLY when switching to a different page. While a page is open the
  // editor owns its content; re-splitting on every `initialContent` change would
  // let the save→invalidate→refetch round-trip (and realtime invalidation) wipe
  // in-progress keystrokes. Pages.tsx mounts this once the page has loaded, so
  // initialContent is correct at mount.
  useEffect(() => {
    setBlocks(splitIntoBlocks(initialContent));
    lastSavedRef.current = initialContent;
    dirtyRef.current = false;
    setSavedAt(null);
    setActiveId(null);
    setMenu(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  // Tolerate an external body change (e.g. realtime) ONLY when not mid-edit.
  useEffect(() => {
    if (dirtyRef.current || activeId) return;
    if (initialContent === lastSavedRef.current) return;
    setBlocks(splitIntoBlocks(initialContent));
    lastSavedRef.current = initialContent;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  const commit = useCallback(
    (md: string) => {
      onChange(md);
      lastSavedRef.current = md;
      dirtyRef.current = false;
      setSavedAt(new Date());
    },
    [onChange],
  );

  const flush = useCallback(() => {
    if (value !== lastSavedRef.current) commit(value);
  }, [value, commit]);

  // Debounced autosave whenever the assembled markdown changes.
  useEffect(() => {
    if (readOnly) return;
    if (value === lastSavedRef.current) return;
    dirtyRef.current = true;
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => commit(value), AUTOSAVE_MS);
    return () => window.clearTimeout(debounceRef.current);
  }, [value, commit, readOnly]);

  // Flush on unmount / page change.
  useEffect(() => () => { flush(); }, [flush]);

  // Resolve titles for the [[ ]] wikilinks present anywhere in the body.
  const refs = useMemo(() => parseMentionRefs(value), [value]);
  const { data: titleMap = {} } = useEntityTitles(refs);

  // ---- block mutation helpers -------------------------------------------------

  const setBlockSrc = (id: string, src: string) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, src } : b)));

  const enterBlock = (id: string) => {
    const b = blocks.find((x) => x.id === id);
    if (!b || b.kind !== "md" || readOnly) return;
    setActiveId(id);
    focusIntent.current = { id, caret: b.src.length };
  };

  const insertBlockAfter = (id: string, openSlash = false) => {
    const newBlock: Block = { id: `blk-new-${Date.now()}`, kind: "md", src: "" };
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      next.splice(idx + 1, 0, newBlock);
      return next;
    });
    setActiveId(newBlock.id);
    focusIntent.current = { id: newBlock.id, caret: 0 };
    if (openSlash) {
      // Open the slash menu anchored at the fresh (empty) block, after focus lands.
      requestAnimationFrame(() => {
        updateAnchor();
        setMenu({ kind: "slash", start: 0, end: 0 });
        setMenuQuery("");
      });
    }
  };

  const mergeIntoPrev = (id: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx <= 0) return prev; // nothing above
      const prevBlock = prev[idx - 1];
      if (prevBlock.kind !== "md") {
        // Can't merge text into a card; just drop the empty block and focus card row.
        focusIntent.current = null;
        setActiveId(null);
        return prev.filter((b) => b.id !== id);
      }
      const caret = prevBlock.src.length;
      const merged = prevBlock.src + prev[idx].src;
      const next = prev
        .map((b) => (b.id === prevBlock.id ? { ...b, src: merged } : b))
        .filter((b) => b.id !== id);
      focusIntent.current = { id: prevBlock.id, caret };
      setActiveId(prevBlock.id);
      return next;
    });
  };

  // Apply queued focus/caret after DOM updates from create/merge.
  useLayoutEffect(() => {
    const intent = focusIntent.current;
    if (!intent || intent.id !== activeId) return;
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    const pos = Math.min(intent.caret, ta.value.length);
    ta.setSelectionRange(pos, pos);
    focusIntent.current = null;
  });

  // ---- inline-editor menu detection ------------------------------------------

  const updateAnchor = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const rect = ta.getBoundingClientRect();
    const c = caretCoordinates(ta, ta.selectionStart);
    setAnchor({ x: rect.left + c.left, y: rect.top + c.top });
  };

  const openMenu = (kind: MenuKind, query: string, start: number, end: number) => {
    setMenu({ kind, start, end });
    setMenuQuery(query);
    updateAnchor();
  };

  const closeMenu = () => { setMenu(null); setMenuQuery(""); };

  const handleActiveChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeId) return;
    const v = e.target.value;
    setBlockSrc(activeId, v);
    const caret = e.target.selectionStart;
    const upto = v.slice(0, caret);
    const wl = upto.match(/\[\[([^[\]\n]*)$/); // [[ not yet closed
    const at = upto.match(/(?:^|\s)@([\w-]*)$/);
    const sl = upto.match(/(?:^|\s)\/([\w]*)$/);
    if (wl) openMenu("wikilink", wl[1], caret - wl[1].length - 2, caret);
    else if (at) openMenu("mention", at[1], caret - at[1].length - 1, caret);
    else if (sl) openMenu("slash", sl[1], caret - sl[1].length - 1, caret);
    else if (menu) closeMenu();
  };

  const placeCaret = (pos: number) => {
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  };

  // Mention + wikilink both resolve to a [[type:id]] token in the active block.
  const handleMentionSelect = (ref: RelationRef) => {
    if (!menu || !activeId) return;
    const src = blocks.find((b) => b.id === activeId)?.src ?? "";
    const token = mentionToken(ref.entityType, ref.entityId) + " ";
    const before = src.slice(0, menu.start);
    const after = src.slice(menu.end);
    setBlockSrc(activeId, before + token + after);
    closeMenu();
    placeCaret(before.length + token.length);
  };

  const handleSlashSelect = (cmd: SlashCommand) => {
    if (!menu || !activeId) return;
    const src = blocks.find((b) => b.id === activeId)?.src ?? "";
    const ins = slashInsertion(cmd.id);
    const before = src.slice(0, menu.start);
    const after = src.slice(menu.end);

    // "/link" hands off to the wikilink picker.
    if (ins === "link") {
      const token = "[[";
      const pos = before.length + token.length;
      setBlockSrc(activeId, before + token + after);
      setMenuQuery("");
      setMenu({ kind: "wikilink", start: before.length, end: pos });
      placeCaret(pos);
      return;
    }

    // Fenced blocks (code/embed/meet) and dividers are their own block: if the
    // current block is otherwise empty, replace it; otherwise append a new one.
    if (ins.block) {
      const bodyEmpty = before.trim() === "" && after.trim() === "";
      const fenced = ins.text.replace(/\n+$/, "");
      if (bodyEmpty) {
        setBlockSrc(activeId, fenced);
      } else {
        setBlockSrc(activeId, (before + after).trimEnd());
        setBlocks((prev) => {
          const idx = prev.findIndex((b) => b.id === activeId);
          const next = [...prev];
          next.splice(idx + 1, 0, { id: `blk-ins-${Date.now()}`, kind: "md", src: fenced });
          return next;
        });
      }
      closeMenu();
      // Re-split so meet/view fences render as their cards immediately.
      requestAnimationFrame(() => {
        setActiveId(null);
        setBlocks((prev) => splitIntoBlocks(joinBlocks(prev)));
      });
      return;
    }

    // Inline tokens (headings, list markers, quote, callout): rewrite the line.
    const text = ins.text;
    setBlockSrc(activeId, before + text + after);
    closeMenu();
    const caretPos = before.length + (ins.caret != null ? ins.caret : text.length);
    placeCaret(caretPos);
  };

  // Enter at end of block → new block; Enter mid-list continues the list.
  const handleActiveKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (menu) return; // let the menu own arrow/enter/esc while open
    const ta = e.currentTarget;
    const atStart = ta.selectionStart === 0 && ta.selectionEnd === 0;
    const atEnd = ta.selectionStart === ta.value.length && ta.selectionEnd === ta.value.length;

    if (e.key === "Enter" && !e.shiftKey) {
      // Continue a list when pressing Enter at the end of a non-empty list item.
      const kind = classifyBlock(ta.value);
      if (atEnd && (kind === "bullet" || kind === "numbered" || kind === "todo")) {
        // If the last item is empty, exit the list into a new plain block.
        const lastLine = ta.value.split("\n").pop() ?? "";
        const emptyItem = /^(\s*)([-*+]\s+(\[[ xX]\]\s+)?|\d+\.\s+)$/.test(lastLine);
        if (!emptyItem) {
          e.preventDefault();
          const marker =
            kind === "todo" ? "- [ ] " : kind === "numbered" ? `${nextOrdinal(ta.value)}. ` : "- ";
          const insertAt = ta.selectionStart;
          const nextSrc = ta.value.slice(0, insertAt) + "\n" + marker + ta.value.slice(insertAt);
          setBlockSrc(activeId!, nextSrc);
          placeCaret(insertAt + 1 + marker.length);
          return;
        }
        // fall through to create a new block below (and strip the empty item)
        e.preventDefault();
        const trimmed = ta.value.replace(/\n?[^\n]*$/, "");
        setBlockSrc(activeId!, trimmed);
        insertBlockAfter(activeId!);
        return;
      }
      if (atEnd) {
        e.preventDefault();
        insertBlockAfter(activeId!);
        return;
      }
    }

    if (e.key === "Backspace" && atStart) {
      // Merge into the previous block (or delete an empty leading block).
      const idx = blocks.findIndex((b) => b.id === activeId);
      if (idx > 0) {
        e.preventDefault();
        mergeIntoPrev(activeId!);
      }
      return;
    }

    if (e.key === "ArrowUp" && atStart) {
      const idx = blocks.findIndex((b) => b.id === activeId);
      const prev = blocks[idx - 1];
      if (prev && prev.kind === "md") { e.preventDefault(); enterBlock(prev.id); }
      return;
    }
    if (e.key === "ArrowDown" && atEnd) {
      const idx = blocks.findIndex((b) => b.id === activeId);
      const nxt = blocks[idx + 1];
      if (nxt && nxt.kind === "md") { e.preventDefault(); enterBlock(nxt.id); }
      return;
    }

    if (e.key === "Escape") {
      (e.target as HTMLTextAreaElement).blur();
    }
  };

  const handleActiveBlur = () => {
    // Committing on blur re-renders the block as formatted markdown.
    if (menu) return; // a menu click steals focus first; don't drop the block
    setActiveId(null);
    flush();
  };

  const toggleTodoAt = (id: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, src: toggleTodo(b.src) } : b)));
  };

  const saving = !readOnly && value !== lastSavedRef.current;
  const savedLabel = savedAt
    ? `Saved · ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : saving ? "Saving…" : "All changes saved";

  const isEmptyDoc = blocks.length === 1 && blocks[0].kind === "md" && blocks[0].src.trim() === "";

  return (
    <div className="flex flex-col">
      {/* Quiet save-state row — no mode toggle, no SOURCE/PREVIEW. */}
      <div className="flex items-center justify-between gap-2 pb-4">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {readOnly ? (
            "Read-only"
          ) : (
            <>
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors duration-fast",
                  saving ? "bg-[hsl(var(--status-warning))]" : "bg-[hsl(var(--status-done))]",
                )}
                aria-hidden
              />
              {savedLabel}
            </>
          )}
        </span>
        {!readOnly && (
          <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
            <kbd className="kbd">/</kbd> blocks
            <span className="text-border">·</span>
            <kbd className="kbd">[[</kbd> to link work
          </span>
        )}
      </div>

      {/* The single formatted writing surface. */}
      <div className="min-h-[40vh]">
        <div className="prose prose-neutral dark:prose-invert max-w-none text-[15px] leading-relaxed prose-headings:font-display prose-headings:tracking-tight prose-p:my-2 prose-headings:scroll-mt-4">
          {blocks.map((block) => (
            <BlockRow
              key={block.id}
              block={block}
              active={block.id === activeId}
              readOnly={!!readOnly}
              titleMap={titleMap}
              textareaRef={block.id === activeId ? textareaRef : undefined}
              onEnter={() => enterBlock(block.id)}
              onInsertAfter={() => insertBlockAfter(block.id, true)}
              onChange={handleActiveChange}
              onKeyDown={handleActiveKeyDown}
              onBlur={handleActiveBlur}
              onSelect={updateAnchor}
              onToggleTodo={() => toggleTodoAt(block.id)}
            />
          ))}

          {/* Trailing click-target: click below the last block to append one. */}
          {!readOnly && (
            <div
              role="button"
              tabIndex={-1}
              aria-label="Add a block"
              onClick={() => {
                const last = blocks[blocks.length - 1];
                if (last.kind === "md" && last.src.trim() === "") enterBlock(last.id);
                else insertBlockAfter(last.id);
              }}
              className="min-h-[2.5rem] cursor-text"
            >
              {isEmptyDoc && !activeId && (
                <p className="my-2 select-none text-muted-foreground/70">
                  Write, or press <kbd className="kbd">/</kbd> for blocks · <kbd className="kbd">[[</kbd> to link work
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <MentionPicker
        open={menu?.kind === "mention" || menu?.kind === "wikilink"}
        query={menuQuery}
        onQueryChange={setMenuQuery}
        onSelect={handleMentionSelect}
        onClose={closeMenu}
        anchor={anchor}
      />
      <SlashMenu
        open={menu?.kind === "slash"}
        query={menuQuery}
        onQueryChange={setMenuQuery}
        onSelect={handleSlashSelect}
        onClose={closeMenu}
        anchor={anchor}
      />
    </div>
  );
}

/** Next ordinal for continuing a numbered list (best-effort). */
function nextOrdinal(src: string): number {
  const nums = [...src.matchAll(/^\s*(\d+)\.\s/gm)].map((m) => parseInt(m[1], 10));
  return nums.length ? Math.max(...nums) + 1 : 1;
}

// ---- one row: rendered block OR its inline editor -----------------------------

interface BlockRowProps {
  block: Block;
  active: boolean;
  readOnly: boolean;
  titleMap: Record<string, string>;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  onEnter: () => void;
  onInsertAfter: () => void;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur: () => void;
  onSelect: () => void;
  onToggleTodo: () => void;
}

function BlockRow({
  block, active, readOnly, titleMap, textareaRef,
  onEnter, onInsertAfter, onChange, onKeyDown, onBlur, onSelect, onToggleTodo,
}: BlockRowProps) {
  // Custom fenced blocks render as their cards (never inline-edited here).
  if (block.kind === "meet") return <div className="not-prose"><MeetingBlock raw={stripFence(block.src)} /></div>;
  if (block.kind === "view") return <div className="not-prose"><LinkedViewBlock raw={stripFence(block.src)} /></div>;

  if (active) {
    return (
      <div className="group/row relative -mx-2 rounded-md px-2">
        <BlockGutter onInsert={onInsertAfter} disabled={readOnly} editing />
        <InlineEditor
          src={block.src}
          textareaRef={textareaRef!}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          onSelect={onSelect}
        />
      </div>
    );
  }

  // Interactive to-do: render the checkbox live; click text to edit the markdown.
  if (isTodoBlock(block.src)) {
    return (
      <div className="group/row relative -mx-2 rounded-md px-2 transition-colors hover:bg-muted/30">
        <BlockGutter onInsert={onInsertAfter} disabled={readOnly} />
        <TodoBlock block={block} readOnly={readOnly} titleMap={titleMap} onToggle={onToggleTodo} onEdit={onEnter} />
      </div>
    );
  }

  // Callout: an emoji-led blockquote becomes the one colored block.
  if (classifyBlock(block.src) === "callout") {
    return (
      <div className="group/row relative -mx-2 rounded-md px-2 transition-colors hover:bg-muted/30">
        <BlockGutter onInsert={onInsertAfter} disabled={readOnly} />
        <Callout block={block} readOnly={readOnly} titleMap={titleMap} onEdit={onEnter} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group/row relative -mx-2 rounded-md px-2 transition-colors",
        !readOnly && "cursor-text hover:bg-muted/30",
      )}
      onClick={readOnly ? undefined : onEnter}
    >
      <BlockGutter onInsert={onInsertAfter} disabled={readOnly} />
      <Markdown md={block.src} titleMap={titleMap} />
    </div>
  );
}

function stripFence(src: string): string {
  const m = /```(?:view|meet)\n([\s\S]*?)```/.exec(src);
  return m ? m[1] : src;
}

/** The left-gutter "+" affordance (drag handle is out of P1 scope). */
function BlockGutter({ onInsert, disabled, editing }: { onInsert: () => void; disabled: boolean; editing?: boolean }) {
  if (disabled) return null;
  return (
    <div
      className={cn(
        "absolute left-[-1.75rem] top-1 flex items-start pt-0.5 opacity-0 transition-opacity duration-fast group-hover/row:opacity-100",
        editing && "opacity-100",
      )}
      contentEditable={false}
    >
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onInsert(); }}
        aria-label="Insert block below"
        title="Insert block (opens the / menu)"
        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <span aria-hidden className="text-base leading-none">+</span>
      </button>
    </div>
  );
}

/** Auto-growing, body-font inline editor for one block's markdown. */
function InlineEditor({
  src, textareaRef, onChange, onKeyDown, onBlur, onSelect,
}: {
  src: string;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur: () => void;
  onSelect: () => void;
}) {
  // Grow to fit content.
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  });
  const placeholder = placeholderFor(classifyBlock(src));
  return (
    <textarea
      ref={textareaRef}
      value={src}
      onChange={(e) => {
        const ta = e.currentTarget;
        ta.style.height = "auto";
        ta.style.height = `${ta.scrollHeight}px`;
        onChange(e);
      }}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onSelect={onSelect}
      onClick={onSelect}
      rows={1}
      placeholder={placeholder}
      aria-label="Edit block"
      className="my-2 block w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-sans text-[15px] leading-relaxed text-foreground shadow-none outline-none placeholder:text-muted-foreground/60 focus:outline-none focus-visible:ring-0"
    />
  );
}

/** Rendered to-do row with a live checkbox that rewrites the markdown. */
function TodoBlock({
  block, readOnly, titleMap, onToggle, onEdit,
}: {
  block: Block; readOnly: boolean; titleMap: Record<string, string>; onToggle: () => void; onEdit: () => void;
}) {
  const m = /^(\s*[-*+]\s+)\[([ xX])\]\s+([\s\S]*)$/.exec(block.src);
  const checked = !!m && m[2].trim().toLowerCase() === "x";
  const text = m ? m[3] : block.src;
  return (
    <div className="my-1.5 flex items-start gap-2">
      <Checkbox
        checked={checked}
        disabled={readOnly}
        onCheckedChange={onToggle}
        className="mt-1"
        aria-label={checked ? "Mark as not done" : "Mark as done"}
      />
      <div
        className={cn("min-w-0 flex-1", !readOnly && "cursor-text", checked && "text-muted-foreground line-through")}
        onClick={readOnly ? undefined : onEdit}
      >
        <Markdown md={text} titleMap={titleMap} inline />
      </div>
    </div>
  );
}

/** The one colored block: an emoji-led blockquote → crimson callout. */
function Callout({
  block, readOnly, titleMap, onEdit,
}: {
  block: Block; readOnly: boolean; titleMap: Record<string, string>; onEdit: () => void;
}) {
  // Strip the leading "> " and pull out a leading emoji if present.
  const inner = block.src.replace(/^>\s?/gm, "");
  const emojiMatch = /^(\p{Extended_Pictographic})\s*/u.exec(inner);
  const emoji = emojiMatch ? emojiMatch[1] : null;
  const body = emojiMatch ? inner.slice(emojiMatch[0].length) : inner;
  return (
    <div
      className={cn(
        "not-prose my-3 flex gap-3 rounded-md border-l-2 border-primary bg-primary/5 px-4 py-3",
        !readOnly && "cursor-text",
      )}
      onClick={readOnly ? undefined : onEdit}
    >
      <span className="mt-0.5 shrink-0 text-base leading-none" aria-hidden>
        {emoji ?? <Lightbulb className="h-4 w-4 text-primary" />}
      </span>
      <div className="prose prose-sm prose-neutral dark:prose-invert min-w-0 max-w-none">
        <Markdown md={body} titleMap={titleMap} inline />
      </div>
    </div>
  );
}

// ---- markdown rendering (preserved from the previous editor) -------------------

function Markdown({ md, titleMap, inline }: { md: string; titleMap: Record<string, string>; inline?: boolean }) {
  return (
    <ReactMarkdown
      components={{
        // For inline contexts (to-do / callout body) unwrap the paragraph so the
        // text sits on one line without extra block margins.
        p: inline
          ? ({ children }) => <>{renderMentions(children, titleMap)}</>
          : ({ children }) => <p>{renderMentions(children, titleMap)}</p>,
        li: ({ children }) => <li>{renderMentions(children, titleMap)}</li>,
      }}
    >
      {md}
    </ReactMarkdown>
  );
}

function renderMentions(children: React.ReactNode, titleMap: Record<string, string>): React.ReactNode {
  if (typeof children === "string") {
    const parts: React.ReactNode[] = [];
    const re = new RegExp(MENTION_TOKEN_RE.source, "g");
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(children))) {
      if (m.index > last) parts.push(children.slice(last, m.index));
      const type = m[1] as EntityType;
      const id = m[2];
      parts.push(<MentionLink key={`mention-${i++}`} type={type} id={id} title={titleMap[`${type}:${id}`]} />);
      last = m.index + m[0].length;
    }
    if (last < children.length) parts.push(children.slice(last));
    return parts;
  }
  if (Array.isArray(children)) return children.map((c, i) => <span key={i}>{renderMentions(c, titleMap)}</span>);
  return children;
}
