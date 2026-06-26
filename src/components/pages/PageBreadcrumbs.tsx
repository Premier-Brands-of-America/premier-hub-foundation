import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { usePageAncestors } from "@/hooks/use-page";

export function PageBreadcrumbs({ pageId }: { pageId: string }) {
  const { data = [] } = usePageAncestors(pageId);
  if (data.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
      <Link to="/pages" className="transition-colors duration-fast hover:text-foreground">Pages</Link>
      {data.map((node, i) => (
        <span key={node.id} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          {i === data.length - 1 ? (
            <span className="text-foreground font-medium truncate max-w-[200px]">{node.title || "Untitled"}</span>
          ) : (
            <Link to={`/pages/${node.id}`} className="hover:text-foreground truncate max-w-[160px]">
              {node.title || "Untitled"}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}