import { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";
import { MentionPicker } from "@/components/pages/MentionPicker";
import type { RelationRef } from "@/types/relations";
import { cn } from "@/lib/utils";

interface Props {
  pageId: string;
  initialContent: string;
  onChange: (md: string) => void;
  readOnly?: boolean;
}

const AUTOSAVE_MS = 800;

export function PageEditor({ pageId, initialContent, onChange, readOnly }: Props) {
  const [value, setValue] = useState(initialContent);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [anchor, setAnchor] = useState<{ x: number; y: number } | undefined>();
  const mentionStartRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<number>();
  const lastSavedRef = useRef<string>(initialContent);

  // Reset when switching pages
  useEffect(() => {
    setValue(initialContent);
    lastSavedRef.current = initialContent;
    setSavedAt(null);
  }, [pageId, initialContent]);

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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValue(v);
    const caret = e.target.selectionStart;
    // Detect @mention trigger
    const upto = v.slice(0, caret);
    const m = upto.match(/(?:^|\s)@([\w-]*)$/);
    if (m) {
      mentionStartRef.current = caret - m[1].length - 1;
      setMentionQuery(m[1]);
      const rect = textareaRef.current?.getBoundingClientRect();
      setAnchor(rect ? { x: rect.left + 24, y: rect.top + 24 } : undefined);
      setMentionOpen(true);
    } else if (mentionOpen) {
      setMentionOpen(false);
    }
  };

  const handleMentionSelect = (ref: RelationRef) => {
    const start = mentionStartRef.current;
    if (start == null || !textareaRef.current) { setMentionOpen(false); return; }
    const ta = textareaRef.current;
    const caret = ta.selectionStart;
    const before = value.slice(0, start);
    const after = value.slice(caret);
    const token = `[[${ref.entityType}:${ref.entityId}]] `;
    const next = before + token + after;
    setValue(next);
    setMentionOpen(false);
    setMentionQuery("");
    mentionStartRef.current = null;
    requestAnimationFrame(() => {
      ta.focus();
      const pos = before.length + token.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const savedLabel = savedAt
    ? `Saved · ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : value !== lastSavedRef.current ? "Saving…" : "All changes saved";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-[11px] text-muted-foreground">{readOnly ? "Read-only" : savedLabel}</span>
        <span className="text-[11px] text-muted-foreground">Type @ to mention</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onBlur={flush}
          readOnly={readOnly}
          placeholder="Start writing… use @ to mention pages, tasks, projects, requests."
          className={cn("font-mono text-sm resize-none h-full min-h-[400px]")}
          aria-label="Page body"
        />
        <div className="prose prose-sm dark:prose-invert max-w-none overflow-auto rounded-md border bg-muted/30 p-4 h-full min-h-[400px]">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p>{renderMentions(children)}</p>,
              li: ({ children }) => <li>{renderMentions(children)}</li>,
            }}
          >
            {value || "_Nothing yet._"}
          </ReactMarkdown>
        </div>
      </div>
      <MentionPicker
        open={mentionOpen}
        query={mentionQuery}
        onQueryChange={setMentionQuery}
        onSelect={handleMentionSelect}
        onClose={() => setMentionOpen(false)}
        anchor={anchor}
      />
    </div>
  );
}

function renderMentions(children: React.ReactNode): React.ReactNode {
  if (typeof children === "string") {
    const parts: React.ReactNode[] = [];
    const re = /\[\[(page|project|task|request|user):([0-9a-fA-F-]{36})\]\]/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(children))) {
      if (m.index > last) parts.push(children.slice(last, m.index));
      parts.push(
        <span key={`mention-${i++}`} className="inline-flex items-center gap-1 rounded bg-primary/10 text-primary px-1.5 py-0.5 text-xs font-medium not-prose">
          @{m[1]}
        </span>,
      );
      last = m.index + m[0].length;
    }
    if (last < children.length) parts.push(children.slice(last));
    return parts;
  }
  if (Array.isArray(children)) return children.map((c, i) => <span key={i}>{renderMentions(c)}</span>);
  return children;
}