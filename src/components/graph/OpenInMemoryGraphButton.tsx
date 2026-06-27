import { Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NodeType } from "@/types/graph";

/**
 * Entry point into the personal Memory Graph (Feature 7), focused on a given
 * entity (local graph, 2 hops). Dropped into page/project/task detail surfaces.
 */
export function OpenInMemoryGraphButton({
  type,
  id,
  className,
  variant = "ghost",
}: {
  type: NodeType;
  id: string;
  className?: string;
  variant?: "ghost" | "outline";
}) {
  const navigate = useNavigate();
  return (
    <Button
      variant={variant}
      size="sm"
      className={cn("gap-1.5 text-xs", className)}
      onClick={() => navigate(`/memory?mode=memory&ct=${type}&ci=${encodeURIComponent(id)}&depth=2`)}
    >
      <Brain className="h-3.5 w-3.5" /> Open in Memory Graph
    </Button>
  );
}
