import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2 } from "lucide-react";
import { useBacklinks } from "@/hooks/use-backlinks";
import type { BacklinkTargetType } from "@/types/pages";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Props {
  targetType: BacklinkTargetType;
  targetId: string;
  className?: string;
}

export function BacklinksPanel({ targetType, targetId, className }: Props) {
  const { data = [], isLoading } = useBacklinks(targetType, targetId);
  const navigate = useNavigate();

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Link2 className="h-3.5 w-3.5" />
          </span>
          Backlinks
        </CardTitle>
        <span className="stat-numeral text-sm text-muted-foreground">{data.length}</span>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-xs text-muted-foreground">Loading backlinks…</p>}
        {!isLoading && data.length === 0 && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Nothing links here yet. Mention this page from another with{" "}
            <span className="font-medium text-foreground">[[</span> to build connections.
          </p>
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
              <div
                className="mt-0.5 line-clamp-2 text-xs text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: row.snippet }}
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