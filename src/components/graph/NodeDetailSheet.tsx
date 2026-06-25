import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EntityIcon } from "@/components/common/EntityIcon";
import { useNavigate } from "react-router-dom";
import type { GraphNode } from "@/types/graph";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  node: GraphNode | null;
  onFocusLocal?: (node: GraphNode) => void;
}

const ROUTE_BY_TYPE: Partial<Record<GraphNode["type"], (id: string) => string>> = {
  project: (id) => `/owned-projects?focus=${id}`,
  task: () => `/tasks`,
  request: (id) => `/requests/${id}`,
  page: (id) => `/pages/${id}`,
};

export function NodeDetailSheet({ open, onOpenChange, node, onFocusLocal }: Props) {
  const navigate = useNavigate();
  if (!node) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[420px]" />
      </Sheet>
    );
  }
  const meta = (node.metadata ?? {}) as Record<string, unknown>;
  const navTo = ROUTE_BY_TYPE[node.type]?.(node.entityId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <EntityIcon type={node.type} className="h-5 w-5" />
            <span className="truncate">{node.label}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">{node.type}</Badge>
            {node.status && <Badge variant="outline">{node.status}</Badge>}
          </div>

          {node.type === "project" && typeof meta.progress === "number" && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Progress</p>
              <Progress value={meta.progress as number} />
              <p className="text-xs text-right">{meta.progress as number}%</p>
            </div>
          )}

          {node.type === "task" && meta.dueDate ? (
            <p><span className="text-muted-foreground">Due:</span> {String(meta.dueDate)}</p>
          ) : null}

          {node.type === "request" && (
            <div className="space-y-1">
              {meta.artId ? <p><span className="text-muted-foreground">ID:</span> {String(meta.artId)}</p> : null}
              {meta.priority ? (
                <p className="flex items-center gap-2">
                  <span className="text-muted-foreground">Priority:</span>
                  <Badge variant="outline" className="capitalize">{String(meta.priority)}</Badge>
                </p>
              ) : null}
              {meta.dueDate ? <p><span className="text-muted-foreground">Due:</span> {String(meta.dueDate)}</p> : null}
            </div>
          )}

          {node.type === "user" && (
            <div className="space-y-1">
              {meta.role ? <p><span className="text-muted-foreground">Role:</span> {String(meta.role)}</p> : null}
            </div>
          )}

          <div className="mt-4 space-y-2">
            {onFocusLocal && (
              <Button variant="outline" className="w-full" onClick={() => onFocusLocal(node)}>
                Focus local graph
              </Button>
            )}
            {navTo && (
              <Button className="w-full" onClick={() => navigate(navTo)}>
                Open in app
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}