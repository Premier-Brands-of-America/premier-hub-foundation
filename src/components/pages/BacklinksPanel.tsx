import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2, Info, Copy, X } from "lucide-react";
import { useBacklinks } from "@/hooks/use-backlinks";
import type { BacklinkTargetType } from "@/types/pages";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MatchHighlight } from "@/components/search/MatchHighlight";

interface Props {
  targetType: BacklinkTargetType;
  targetId: string;
  /** Page title, used to offer a copyable `[[title]]` wikilink when empty. */
  pageTitle?: string;
  /** When present, renders a close affordance (rail/expandable usage). */
  onClose?: () => void;
  className?: string;
}

export function BacklinksPanel({ targetType, targetId, pageTitle, onClose, className }: Props) {
  const { data = [], isLoading } = useBacklinks(targetType, targetId);
  const navigate = useNavigate();

  const wikilink = pageTitle ? `[[${pageTitle}]]` : null;
  const copyWikilink = async () => {
    if (!wikilink) return;
    try {
      await navigator.clipboard.writeText(wikilink);
      toast({ title: "Copied", description: `${wikilink} is on your clipboard.` });
    } catch {
      toast({ title: "Couldn't copy", description: "Copy the link manually.", variant: "destructive" });
    }
  };

  return (
    <Card className={cn("border-0 shadow-none", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Link2 className="h-3.5 w-3.5" />
          </span>
          Mentioned in
          <Info
            className="h-3.5 w-3.5 cursor-help text-muted-foreground"
            aria-label="What is this?"
            title="Other pages, projects, tasks or requests that link to or mention this item. It's an automatic list of where this shows up across the hub."
          />
        </CardTitle>
        <div className="flex items-center gap-1.5">
          <span className="stat-numeral text-sm text-muted-foreground">{data.length}</span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-muted-foreground transition-colors duration-fast hover:bg-accent hover:text-foreground"
              aria-label="Collapse backlinks"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!isLoading && data.length === 0 && (
          <div className="space-y-2.5">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Nothing points here yet. Paste this link into another page to reference it:
            </p>
            {wikilink && (
              <button
                type="button"
                onClick={copyWikilink}
                className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-left transition-colors duration-fast hover:bg-accent"
                aria-label={`Copy ${wikilink}`}
              >
                <code className="truncate font-mono text-[11px] text-foreground">{wikilink}</code>
                <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            )}
          </div>
        )}
        {data.map((row) => (
          <button
            key={row.source_page_id + row.created_at}
            type="button"
            onClick={() => navigate(`/pages/${row.source_page_id}`)}
            className="block w-full rounded-md border border-border bg-background px-3 py-2 text-left transition-colors duration-fast hover:bg-accent"
          >
            <div className="truncate text-sm font-medium">{row.source_title}</div>
            {row.snippet && (
              <MatchHighlight
                html={row.snippet}
                className="mt-0.5 line-clamp-2 text-xs text-muted-foreground"
              />
            )}
            <div className="mt-1.5 text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
