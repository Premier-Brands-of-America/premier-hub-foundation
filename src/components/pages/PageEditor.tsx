import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";
import { MentionPicker } from "@/components/pages/MentionPicker";
import { SlashMenu } from "@/components/pages/SlashMenu";
import { MentionLink } from "@/components/pages/MentionLink";
import { LinkedViewBlock } from "@/components/pages/LinkedViewBlock";
import { MeetingBlock } from "@/components/pages/MeetingBlock";
import { useEntityTitles } from "@/hooks/use-entity-titles";
import { MENTION_TOKEN_RE, mentionToken, parseMentionRefs } from "@/lib/entity-links";
import { slashInsertion, type SlashCommand } from "@/lib/slash-commands";
import type { RelationRef, EntityType } from "@/types/relations";
import { cn } from "@/lib/utils";

interface Props {
  pageId: string;
  initialContent: string;
  onChange: (md: string) => void;
  readOnly?: boolean;
}

type MenuKind = "mention" | "wikilink" | "slash";
interface MenuState {
  kind: MenuKind;
  start: number; // index of the trigger's first char in `value`
  end: number; // caret index just after the trigger
}

const AUTOSAVE_MS = 800;

export function PageEditor({ pageId, initialContent, onChange, readOnly }: Props) {
  const [value, setValue] = useState(initialContent);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [menuQuery, setMenuQuery] = useState("");
  const [anchor, setAnchor] = useState<{ x: number; y: number } | undefined>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<number>();
  const lastSavedRef = useRef<string>(initialContent);

  // Reset ONLY when switching to a different page. The editor owns its content
  // while open; depending on `initialContent` here caused the save→invalidate→
  // refetch round-trip (and realtime invalidation) to call setValue mid-typing,
  // clobbering in-progress keystrokes (fast typing → text wiped). Pages.tsx mounts
  // this only once the page has loaded, so initialContent is correct at mount.
  useEffect(() => {
    setValue(initialContent);
    lastSavedRef.current = initialContent;
    setSavedAt(null);
    setMenu(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  const flush = useCallback(() => {
    if (value !== lastSavedRef.current) {
      onChange(value);
      lastSavedRef.current = value;
      setSavedAt(new Date());
    }
  }, [value, onChange]);

  // Debounced autosave
  useEffect(() => {
    if (readOnly) return;
    if (value === lastSavedRef.current) return;
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onChange(value);
      lastSavedRef.current = value;
      setSavedAt(new Date());
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(debounceRef.current);
  }, [value, onChange, readOnly]);

  // Flush on unmount / page change
  useEffect(() => () => { flush(); }, [flush]);

  // Resolve titles for the [[ ]] wikilinks present in the body
  const refs = useMemo(() => parseMentionRefs(value), [value]);
  const { data: titleMap = {} } = useEntityTitles(refs);

  const openMenu = (kind: MenuKind, query: string, start: number, end: number) => {
    setMenu({ kind, start, end });
    setMenuQuery(query);
    const rect = textareaRef.current?.getBoundingClientRect();
    setAnchor(rect ? { x: rect.left + 24, y: rect.top + 24 } : undefined);
  };

  const closeMenu = () => { setMenu(null); setMenuQuery(""); };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValue(v);
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

  // Mention + wikilink both resolve to a [[type:id]] token
  const handleMentionSelect = (ref: RelationRef) => {
    if (!menu) return;
    const token = mentionToken(ref.entityType, ref.entityId) + " ";
    const before = value.slice(0, menu.start);
    const after = value.slice(menu.end);
    setValue(before + token + after);
    closeMenu();
    placeCaret(before.length + token.length);
  };

  const handleSlashSelect = (cmd: SlashCommand) => {
    if (!menu) return;
    const ins = slashInsertion(cmd.id);
    const before = value.slice(0, menu.start);
    const after = value.slice(menu.end);

    // "/link" hands off to the wikilink picker
    if (ins === "link") {
      const token = "[[";
      const pos = before.length + token.length;
      setValue(before + token + after);
      setMenuQuery("");
      setMenu({ kind: "wikilink", start: before.length, end: pos });
      placeCaret(pos);
      return;
    }

    const prefix = ins.block && before.length > 0 && !before.endsWith("\n") ? "\n" : "";
    const text = prefix + ins.text;
    setValue(before + text + after);
    closeMenu();
    const caretPos = before.length + (ins.caret != null ? prefix.length + ins.caret : text.length);
    placeCaret(caretPos);
  };

  const savedLabel = savedAt
    ? `Saved · ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : value !== lastSavedRef.current ? "Saving…" : "All changes saved";

  const saving = !readOnly && value !== lastSavedRef.current;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {readOnly ? (
            "Read-only"
          ) : (
            <>
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  saving ? "bg-[hsl(var(--status-warning))]" : "bg-[hsl(var(--status-done))]",
                )}
                aria-hidden
              />
              {savedLabel}
            </>
          )}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <kbd className="kbd">/</kbd> blocks
          <span className="text-border">·</span>
          <kbd className="kbd">[[</kbd> or <kbd className="kbd">@</kbd> to link
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="flex min-h-0 flex-col">
          <span className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Source
          </span>
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onBlur={flush}
            readOnly={readOnly}
            placeholder="Start writing… / for blocks, [[ to link pages, tasks, and projects, /meet for meeting notes."
            className={cn("h-full min-h-[400px] flex-1 resize-none font-mono text-sm leading-relaxed")}
            aria-label="Page body"
          />
        </div>
        <div className="flex min-h-0 flex-col">
          <span className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Preview
          </span>
          <div className="prose prose-sm dark:prose-invert h-full min-h-[400px] max-w-none flex-1 overflow-auto rounded-lg border border-border bg-muted/30 p-4">
            {renderBody(value, titleMap)}
          </div>
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

/** Split out the `view`/`meet` fenced blocks and render the rest as markdown. */
function renderBody(md: string, titleMap: Record<string, string>): React.ReactNode {
  if (!md.trim()) return <p className="text-muted-foreground">Your formatted page appears here as you write.</p>;
  const re = /```(view|meet)\n([\s\S]*?)```\n?/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(md))) {
    if (m.index > last) parts.push(<Markdown key={`t${i}`} md={md.slice(last, m.index)} titleMap={titleMap} />);
    parts.push(
      m[1] === "view"
        ? <LinkedViewBlock key={`b${i}`} raw={m[2]} />
        : <MeetingBlock key={`b${i}`} raw={m[2]} />,
    );
    last = m.index + m[0].length;
    i++;
  }
  if (last < md.length) parts.push(<Markdown key={`t${i}`} md={md.slice(last)} titleMap={titleMap} />);
  return parts;
}

function Markdown({ md, titleMap }: { md: string; titleMap: Record<string, string> }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p>{renderMentions(children, titleMap)}</p>,
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
