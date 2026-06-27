/**
 * Comments / activity thread with @mention support. Shared across Projects,
 * Tasks, and Art Requests. Mentions use explicit `@[Name](id)` tokens (parsed
 * by lib/mentions). The parent wires `onAdd` to persist + fire notifications.
 */
import { useRef, useState, type ReactNode } from "react";
import { Send, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { insertMention } from "@/lib/mentions";

export interface ThreadUser {
  id: string;
  name: string;
}
export interface ThreadComment {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

const MENTION_RE = /@\[([^\]]+)\]\(([^)]+)\)/g;

/** Render a comment body, highlighting @mentions. */
function renderBody(body: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  let i = 0;
  while ((m = MENTION_RE.exec(body)) !== null) {
    if (m.index > last) out.push(body.slice(last, m.index));
    out.push(
      <span
        key={`m-${i++}`}
        className="rounded bg-primary/10 px-1 font-medium text-primary"
      >
        @{m[1]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < body.length) out.push(body.slice(last));
  return out;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function CommentsThread({
  comments,
  users,
  onAdd,
  className,
}: {
  comments: ThreadComment[];
  users: ThreadUser[];
  onAdd: (body: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  function onDraftChange(text: string) {
    setDraft(text);
    const caret = taRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, caret);
    const at = before.lastIndexOf("@");
    if (at >= 0 && !/\s/.test(before.slice(at + 1))) {
      setQuery(before.slice(at + 1).toLowerCase());
      setMenuOpen(true);
    } else {
      setMenuOpen(false);
    }
  }

  function pick(u: ThreadUser) {
    const caret = taRef.current?.selectionStart ?? draft.length;
    const res = insertMention(draft, caret, { userId: u.id, display: u.name });
    setDraft(res.text);
    setMenuOpen(false);
    requestAnimationFrame(() => taRef.current?.focus());
  }

  function submit() {
    const body = draft.trim();
    if (!body) return;
    onAdd(body);
    setDraft("");
    setMenuOpen(false);
  }

  const matches = users
    .filter((u) => u.name.toLowerCase().includes(query))
    .slice(0, 6);

  return (
    <div className={cn("space-y-4", className)}>
      <ul className="space-y-3">
        {comments.length === 0 && (
          <li className="text-sm text-muted-foreground">No comments yet.</li>
        )}
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-xs">
                {initials(c.authorName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{c.authorName}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">
                {renderBody(c.body)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="relative">
        <Textarea
          ref={taRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Add a comment… use @ to mention someone"
          rows={3}
          className="resize-none pr-10"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />
        {menuOpen && matches.length > 0 && (
          <div className="absolute bottom-full z-20 mb-1 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-md">
            {matches.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => pick(u)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent"
              >
                <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
                {u.name}
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            ⌘/Ctrl + Enter to send
          </span>
          <Button size="sm" onClick={submit} disabled={!draft.trim()}>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
