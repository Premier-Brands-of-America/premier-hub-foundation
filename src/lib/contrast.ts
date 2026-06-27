/**
 * WCAG contrast utilities for the per-user color customization feature.
 *
 * Theme tokens in this app are stored as HSL triples (e.g. "228 12% 92%") so
 * they can be dropped straight into `hsl(var(--token))`. Native color pickers,
 * however, emit hex. These helpers accept either form, compute WCAG 2.1
 * contrast ratios, and — when a chosen combo fails AA — find the nearest
 * passing shade by walking the foreground's lightness while preserving hue.
 */

export interface Rgb {
  r: number; // 0-255
  g: number;
  b: number;
}

export interface Hsl {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

/** WCAG AA minimums: 4.5:1 for normal body text, 3:1 for large text. */
export const AA_NORMAL = 4.5;
export const AA_LARGE = 3;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Parse a hex / hsl-triple / hsl()/rgb() string into HSL. Returns null if unparseable. */
export function parseToHsl(input: string): Hsl | null {
  const rgb = parseToRgb(input);
  if (!rgb) return null;
  return rgbToHsl(rgb);
}

/** Parse a color string into RGB. Supports #rgb, #rrggbb, "H S% L%" token triples, hsl(...), rgb(...). */
export function parseToRgb(input: string): Rgb | null {
  if (!input) return null;
  const s = input.trim();

  // hex
  const hex = s.startsWith("#") ? s.slice(1) : /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(s) ? s : null;
  if (hex) {
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    if (full.length !== 6) return null;
    const num = Number.parseInt(full, 16);
    if (Number.isNaN(num)) return null;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  // rgb(...)
  const rgbMatch = s.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(/[,/\s]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    return { r: clamp(parts[0], 0, 255), g: clamp(parts[1], 0, 255), b: clamp(parts[2], 0, 255) };
  }

  // hsl(...) or bare token triple "H S% L%"
  const hslMatch = s.match(/^hsla?\(([^)]+)\)$/i);
  const body = hslMatch ? hslMatch[1] : s;
  const hslParts = body.split(/[,/\s]+/).filter(Boolean);
  if (hslParts.length >= 3) {
    const h = Number.parseFloat(hslParts[0]);
    const sat = Number.parseFloat(hslParts[1]);
    const lig = Number.parseFloat(hslParts[2]);
    if (![h, sat, lig].some(Number.isNaN)) {
      return hslToRgb({ h, s: sat, l: lig });
    }
  }
  return null;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hn = ((h % 360) + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hn < 60) [r, g, b] = [c, x, 0];
  else if (hn < 120) [r, g, b] = [x, c, 0];
  else if (hn < 180) [r, g, b] = [0, c, x];
  else if (hn < 240) [r, g, b] = [0, x, c];
  else if (hn < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/** Format an HSL value as a token triple, e.g. "228 12% 92%". */
export function hslToTokenTriple({ h, s, l }: Hsl): string {
  return `${Math.round(((h % 360) + 360) % 360)} ${Math.round(clamp(s, 0, 100))}% ${Math.round(clamp(l, 0, 100))}%`;
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to2 = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

/** WCAG relative luminance of an sRGB color. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (c: number) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two colors (any accepted format). Returns 1 if either is unparseable. */
export function contrastRatio(a: string | Rgb, b: string | Rgb): number {
  const ca = typeof a === "string" ? parseToRgb(a) : a;
  const cb = typeof b === "string" ? parseToRgb(b) : b;
  if (!ca || !cb) return 1;
  const la = relativeLuminance(ca);
  const lb = relativeLuminance(cb);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** True when fg-on-bg meets WCAG AA (4.5:1 normal, 3:1 large). */
export function meetsWcagAA(fg: string | Rgb, bg: string | Rgb, large = false): boolean {
  return contrastRatio(fg, bg) >= (large ? AA_LARGE : AA_NORMAL);
}

export interface NearestPassing {
  /** The adjusted foreground as a token triple (matches token storage). */
  triple: string;
  /** The adjusted foreground as hex (for the color picker). */
  hex: string;
  /** Resulting contrast ratio against the background. */
  ratio: number;
  /** Whether any adjustment was needed (false => original already passed). */
  adjusted: boolean;
}

/**
 * Find the nearest passing foreground shade by walking lightness while keeping
 * hue+saturation. Tries both directions and returns whichever passes with the
 * smallest lightness delta from the original. Returns null only if the
 * foreground is unparseable.
 */
export function nearestPassingForeground(
  fg: string | Rgb,
  bg: string | Rgb,
  opts: { large?: boolean } = {},
): NearestPassing | null {
  const fgRgb = typeof fg === "string" ? parseToRgb(fg) : fg;
  const bgRgb = typeof bg === "string" ? parseToRgb(bg) : bg;
  if (!fgRgb || !bgRgb) return null;
  const target = opts.large ? AA_LARGE : AA_NORMAL;

  const startRatio = contrastRatio(fgRgb, bgRgb);
  if (startRatio >= target) {
    const hsl = rgbToHsl(fgRgb);
    return { triple: hslToTokenTriple(hsl), hex: rgbToHex(fgRgb), ratio: startRatio, adjusted: false };
  }

  const base = rgbToHsl(fgRgb);
  let best: { delta: number; l: number; ratio: number } | null = null;
  // Scan every integer lightness; pick the passing one closest to the original.
  for (let l = 0; l <= 100; l++) {
    const candidate = hslToRgb({ h: base.h, s: base.s, l });
    const ratio = contrastRatio(candidate, bgRgb);
    if (ratio >= target) {
      const delta = Math.abs(l - base.l);
      if (!best || delta < best.delta) best = { delta, l, ratio };
    }
  }
  if (!best) {
    // Saturation can block pure-lightness solutions; fall back to grayscale extreme.
    const bgL = rgbToHsl(bgRgb).l;
    const l = bgL >= 50 ? 0 : 100;
    const candidate = hslToRgb({ h: base.h, s: base.s, l });
    return {
      triple: hslToTokenTriple({ h: base.h, s: base.s, l }),
      hex: rgbToHex(candidate),
      ratio: contrastRatio(candidate, bgRgb),
      adjusted: true,
    };
  }
  const adjusted = hslToRgb({ h: base.h, s: base.s, l: best.l });
  return {
    triple: hslToTokenTriple({ h: base.h, s: base.s, l: best.l }),
    hex: rgbToHex(adjusted),
    ratio: best.ratio,
    adjusted: true,
  };
}
