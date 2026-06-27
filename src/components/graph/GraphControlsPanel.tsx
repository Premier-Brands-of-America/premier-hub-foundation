import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { DEFAULT_FORCES, type GraphForces } from "@/types/graph";

interface Props {
  forces: GraphForces;
  onChange: (next: GraphForces) => void;
  /** Local-graph depth (1–3); only shown when the graph is rooted on an entity. */
  depth?: number;
  onDepthChange?: (d: number) => void;
  rooted?: boolean;
}

interface Row {
  key: keyof GraphForces;
  label: string;
  min: number;
  max: number;
  step: number;
  /** charge is stored negative but shown as a positive "repel" magnitude. */
  invert?: boolean;
}

const ROWS: Row[] = [
  { key: "charge", label: "Repel force", min: 20, max: 400, step: 10, invert: true },
  { key: "linkDistance", label: "Link distance", min: 20, max: 160, step: 5 },
  { key: "linkStrength", label: "Link force", min: 0, max: 1, step: 0.05 },
  { key: "center", label: "Center force", min: 0, max: 1, step: 0.05 },
  { key: "nodeSize", label: "Node size", min: 2, max: 12, step: 1 },
];

export function GraphControlsPanel({ forces, onChange, depth = 1, onDepthChange, rooted }: Props) {
  const set = (key: keyof GraphForces, v: number, invert?: boolean) =>
    onChange({ ...forces, [key]: invert ? -v : v });

  return (
    <Card className="w-60 shadow-md bg-card/95 backdrop-blur-sm">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Forces</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label="Reset forces"
          onClick={() => onChange({ ...DEFAULT_FORCES })}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {ROWS.map((row) => {
          const raw = forces[row.key];
          const shown = row.invert ? Math.abs(raw) : raw;
          return (
            <div key={row.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="tabular-nums">{row.step < 1 ? shown.toFixed(2) : shown}</span>
              </div>
              <Slider
                value={[shown]}
                min={row.min}
                max={row.max}
                step={row.step}
                onValueChange={([v]) => set(row.key, v, row.invert)}
                aria-label={row.label}
              />
            </div>
          );
        })}

        {rooted && onDepthChange && (
          <div className="space-y-1 border-t pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Local depth</span>
              <span className="tabular-nums">{depth}</span>
            </div>
            <Slider
              value={[depth]}
              min={1}
              max={3}
              step={1}
              onValueChange={([v]) => onDepthChange(v)}
              aria-label="Local graph depth"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
