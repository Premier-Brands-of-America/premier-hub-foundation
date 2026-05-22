import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link2 className="h-3.5 w-3.5 text-muted-foreground" /> Backlinks
        </CardTitle>
        <Badge variant="secondary">{data.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!isLoading && data.length === 0 && (
          <p className="text-xs text-muted-foreground">No pages link here yet.</p>
        )}
        {data.map((row) => (
          <button
            key={row.source_page_id + row.created_at}
            type="button"
            onClick={() => navigate(`/pages/${row.source_page_id}`)}
            className="block w-full text-left rounded-md border bg-background hover:bg-accent/40 px-3 py-2 transition"
          >
            <div className="text-sm font-medium truncate">{row.source_title}</div>
            {row.snippet && (
              <div
                className="text-xs text-muted-foreground mt-0.5 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: row.snippet }}
              />
            )}
            <div className="text-[11px] text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}