// ============================================================================
// OutlookEmailSearch — Notion-parity Outlook email search surface (OUTLOOK)
// ----------------------------------------------------------------------------
// Live, server-side search over the user's mailbox (mail-search Edge Function).
// Tokens never reach the browser; results are not persisted.
// ============================================================================

import { useState, type FormEvent } from "react";
import { ExternalLink, Loader2, Mail, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { useMailSearch } from "./hooks";

export function OutlookEmailSearch() {
  const [query, setQuery] = useState("");
  const search = useMailSearch();
  const messages = search.data?.messages ?? [];

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) search.mutate(q);
  };

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Outlook email…"
            className="pl-8"
            aria-label="Search Outlook email"
          />
        </div>
        <Button type="submit" size="sm" disabled={search.isPending || !query.trim()}>
          {search.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      {search.isPending && (
        <p className="text-xs text-muted-foreground">Searching your mailbox…</p>
      )}

      {!search.isPending && search.isSuccess && messages.length === 0 && (
        <p className="text-xs text-muted-foreground">No messages found.</p>
      )}

      <ul className="space-y-2">
        {messages.map((m) => (
          <li key={m.id}>
            <a
              href={m.web_link ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md border bg-background px-3 py-2 transition hover:bg-accent/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{m.subject}</span>
                </span>
                {m.web_link && (
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
              </div>
              {m.preview && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{m.preview}</p>
              )}
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                {m.from_name && <span className="truncate">{m.from_name}</span>}
                {m.received_at && (
                  <span className="shrink-0">
                    {formatDistanceToNow(new Date(m.received_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
