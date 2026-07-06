/**
 * Curated color presets for the per-user appearance customization (Feature 2).
 *
 * Each preset supplies text / highlight / background for BOTH light and dark
 * themes, as HSL triples (token format, e.g. "228 12% 92%") so they map straight
 * onto the design tokens (--foreground / --primary / --background).
 *
 * Text and background are kept at (or near) the shipped defaults so body text
 * always clears WCAG AA; presets mainly vary the highlight/accent. colorPresets
 * is validated for AA in colorPresets.test.ts.
 */

export type ColorChannel = "text" | "highlight" | "background";

export interface ColorTriple {
  text: string;
  highlight: string;
  background: string;
}

export interface ColorPreset {
  id: string;
  name: string;
  /** Short hint surfaced under the preset name. */
  hint: string;
  light: ColorTriple;
  dark: ColorTriple;
}

/** The shipped default tokens — used as the safe text/background base and as the "Default" preset. */
export const DEFAULT_LIGHT: ColorTriple = {
  text: "24 10% 12%",
  highlight: "347 80% 41%",
  background: "30 14% 98%",
};
export const DEFAULT_DARK: ColorTriple = {
  text: "30 10% 93%",
  highlight: "349 90% 64%",
  background: "24 10% 5.5%",
};

export const colorPresets: ColorPreset[] = [
  {
    id: "default",
    name: "Premier",
    hint: "The shipped look — Premier crimson on carbon",
    light: DEFAULT_LIGHT,
    dark: DEFAULT_DARK,
  },
  {
    id: "ocean",
    name: "Ocean",
    hint: "Cool azure accent",
    light: { text: "215 30% 12%", highlight: "205 85% 42%", background: "205 30% 98%" },
    dark: { text: "205 20% 92%", highlight: "199 90% 60%", background: "212 30% 5%" },
  },
  {
    id: "forest",
    name: "Forest",
    hint: "Calm green accent",
    light: { text: "150 18% 12%", highlight: "152 60% 33%", background: "140 20% 98%" },
    dark: { text: "150 12% 92%", highlight: "150 65% 55%", background: "155 18% 5%" },
  },
  {
    id: "sunset",
    name: "Sunset",
    hint: "Warm amber accent",
    light: { text: "24 30% 12%", highlight: "28 90% 42%", background: "36 40% 98%" },
    dark: { text: "30 15% 92%", highlight: "38 95% 60%", background: "24 18% 5%" },
  },
  {
    id: "grape",
    name: "Grape",
    hint: "Electric-violet accent",
    light: { text: "260 20% 12%", highlight: "262 70% 48%", background: "270 30% 98%" },
    dark: { text: "260 12% 92%", highlight: "258 90% 72%", background: "262 18% 5%" },
  },
  {
    id: "mono",
    name: "Monochrome",
    hint: "Neutral, no chroma",
    light: { text: "0 0% 12%", highlight: "0 0% 30%", background: "0 0% 98%" },
    dark: { text: "0 0% 92%", highlight: "0 0% 78%", background: "0 0% 5%" },
  },
];

export function getPreset(id: string): ColorPreset | undefined {
  return colorPresets.find((p) => p.id === id);
}
