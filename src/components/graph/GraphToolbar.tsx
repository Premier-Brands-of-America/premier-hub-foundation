import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Maximize2, ZoomIn, ZoomOut, Download } from "lucide-react";
import { GraphSearch } from "./GraphSearch";
import type { GraphNode } from "@/types/graph";

interface Props {
  nodes: GraphNode[];
  onFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onExport: () => void;
  onSearchSelect: (n: GraphNode) => void;
}

export function GraphToolbar({ nodes, onFit, onZoomIn, onZoomOut, onExport, onSearchSelect }: Props) {
  return (
    <Card className="p-2 shadow-md bg-card/95 backdrop-blur-sm flex items-center gap-1">
      <GraphSearch nodes={nodes} onSelect={onSearchSelect} />
      <Button variant="ghost" size="icon" onClick={onZoomOut} aria-label="Zoom out">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onZoomIn} aria-label="Zoom in">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onFit} aria-label="Fit to screen">
        <Maximize2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onExport} aria-label="Export PNG">
        <Download className="h-4 w-4" />
      </Button>
    </Card>
  );
}