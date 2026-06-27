import { useState } from "react";
import { AlertTriangle, Check, Moon, RotateCcw, Sun, Wand2 } from "lucide-react";
import { useDesignMode, type Theme } from "@/providers/DesignModeProvider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { isPreviewEnvironment } from "@/lib/environment";
import {
  colorPresets,
  DEFAULT_DARK,
  DEFAULT_LIGHT,
  type ColorChannel,
} from "@/lib/colorPresets";
import {
  contrastRatio,
  hslToTokenTriple,
  nearestPassingForeground,
  parseToRgb,
  rgbToHex,
  rgbToHsl,
} from "@/lib/contrast";

const CHANNELS: { key: ColorChannel; label: string; hint: string }[] = [
  { key: "text", label: "Text", hint: "Body text color" },
  { key: "highlight", label: "Highlight", hint: "Accent / primary actions" },
  { key: "background", label: "Background", hint: "App canvas" },
];

const tripleToHex = (triple: string): string => {
  const rgb = parseToRgb(triple);
  return rgb ? rgbToHex(rgb) : "#000000";
};
const hexToTriple = (hex: string): string => {
  const rgb = parseToRgb(hex);
  return rgb ? hslToTokenTriple(rgbToHsl(rgb)) : hex;
};

/**
 * Settings → Appearance: per-user text / highlight / background colors for the
 * light and dark themes, with curated presets and a live WCAG AA guardrail.
 * Persists via DesignModeProvider (profiles.preferences in real mode,
 * localStorage in preview).
 */
export function AppearanceColors() {
  const { theme, colorOverrides, setColor, applyColorPreset, resetColors } = useDesignMode();
  const [editing, setEditing] = useState<Theme>(theme);
  const isPreview = isPreviewEnvironment();

  const defaults = editing === "dark" ? DEFAULT_DARK : DEFAULT_LIGHT;
  const current = (ch: ColorChannel) => colorOverrides[editing][ch] ?? defaults[ch];

  const textTriple = current("text");
  const bgTriple = current("background");
  const hlTriple = current("highlight");

  const bodyRatio = contrastRatio(textTriple, bgTriple);
  const hlRatio = contrastRatio(hlTriple, bgTriple);
  const bodyFailsAA = bodyRatio < 4.5;

  const ratioFor = (ch: ColorChannel) =>
    ch === "text" ? bodyRatio : ch === "highlight" ? hlRatio : null;

  const fixContrast = () => {
    const fixed = nearestPassingForeground(textTriple, bgTriple);
    if (fixed) setColor(editing, "text", fixed.triple);
  };

  const hasOverrides =
    Object.keys(colorOverrides.light).length > 0 || Object.keys(colorOverrides.dark).length > 0;

  return (
    <div className="space-y-4 border-t border-border pt-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Label className="block">Custom colors</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Personalize text, highlight, and background — per theme. Layered over the design tokens.
          </p>
        </div>
        <ToggleGroup
          type="single"
          value={editing}
          onValueChange={(v) => v && setEditing(v as Theme)}
          className="justify-start"
        >
          <ToggleGroupItem value="light" aria-label="Edit light colors" className="gap-1.5">
            <Sun className="h-3.5 w-3.5" /> Light
          </ToggleGroupItem>
          <ToggleGroupItem value="dark" aria-label="Edit dark colors" className="gap-1.5">
            <Moon className="h-3.5 w-3.5" /> Dark
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {colorPresets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyColorPreset(p.id)}
            title={p.hint}
            className="group flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-xs transition-colors hover:border-foreground/30 hover:bg-accent"
          >
            <span className="flex -space-x-1">
              {(["background", "text", "highlight"] as ColorChannel[]).map((ch) => (
                <span
                  key={ch}
                  className="h-3.5 w-3.5 rounded-full border border-background"
                  style={{ background: `hsl(${(editing === "dark" ? p.dark : p.light)[ch]})` }}
                />
              ))}
            </span>
            {p.name}
          </button>
        ))}
      </div>

      {/* Channel pickers */}
      <div className="grid gap-3 sm:grid-cols-3">
        {CHANNELS.map(({ key, label, hint }) => {
          const triple = current(key);
          const ratio = ratioFor(key);
          const overridden = colorOverrides[editing][key] != null;
          return (
            <div key={key} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor={`color-${key}`} className="text-xs font-medium">
                  {label}
                </Label>
                {overridden && (
                  <button
                    type="button"
                    onClick={() => setColor(editing, key, null)}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    reset
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id={`color-${key}`}
                  type="color"
                  value={tripleToHex(triple)}
                  onChange={(e) => setColor(editing, key, hexToTriple(e.target.value))}
                  className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  aria-describedby={ratio != null ? `ratio-${key}` : undefined}
                />
                <span className="font-mono text-[10px] text-muted-foreground">
                  {tripleToHex(triple)}
                </span>
              </div>
              {ratio != null && (
                <div id={`ratio-${key}`} className="mt-2">
                  <Badge
                    variant="outline"
                    className={
                      ratio >= 4.5
                        ? "border-transparent bg-[hsl(var(--success)/0.16)] text-[hsl(var(--success))]"
                        : ratio >= 3
                          ? "border-transparent bg-[hsl(var(--warning)/0.16)] text-[hsl(var(--warning))]"
                          : "border-transparent bg-[hsl(var(--destructive)/0.16)] text-[hsl(var(--destructive))]"
                    }
                  >
                    {ratio >= 4.5 ? (
                      <Check className="mr-1 h-3 w-3" />
                    ) : (
                      <AlertTriangle className="mr-1 h-3 w-3" />
                    )}
                    {ratio.toFixed(1)}:1 {ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA large" : "fail"}
                  </Badge>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Contrast guardrail — never let an illegible combo save silently */}
      {bodyFailsAA && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.08)] p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-center gap-2 text-[hsl(var(--destructive))]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Body text is {bodyRatio.toFixed(1)}:1 — below the WCAG AA minimum of 4.5:1.
          </span>
          <Button size="sm" variant="outline" onClick={fixContrast} className="gap-1.5">
            <Wand2 className="h-3.5 w-3.5" /> Use nearest passing shade
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isPreview
            ? "Preview mode — colors apply live and persist locally (not to your account)."
            : "Saved to your account and applied across the hub."}
        </p>
        {hasOverrides && (
          <Button size="sm" variant="ghost" onClick={resetColors} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Reset all
          </Button>
        )}
      </div>
    </div>
  );
}
