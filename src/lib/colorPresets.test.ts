import { describe, it, expect } from "vitest";
import { colorPresets } from "./colorPresets";
import { contrastRatio, parseToRgb } from "./contrast";

describe("colorPresets", () => {
  it("has unique ids and both theme variants", () => {
    const ids = colorPresets.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of colorPresets) {
      expect(p.light).toBeTruthy();
      expect(p.dark).toBeTruthy();
    }
  });

  it("every triple parses as a valid color", () => {
    for (const p of colorPresets) {
      for (const variant of [p.light, p.dark]) {
        expect(parseToRgb(variant.text)).not.toBeNull();
        expect(parseToRgb(variant.highlight)).not.toBeNull();
        expect(parseToRgb(variant.background)).not.toBeNull();
      }
    }
  });

  it("body text passes WCAG AA (>=4.5:1) on its background in both themes", () => {
    for (const p of colorPresets) {
      for (const [name, variant] of [
        ["light", p.light],
        ["dark", p.dark],
      ] as const) {
        const ratio = contrastRatio(variant.text, variant.background);
        expect(ratio, `${p.id} ${name} text-on-bg = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("highlight passes large-text AA (>=3:1) on its background", () => {
    for (const p of colorPresets) {
      for (const [name, variant] of [
        ["light", p.light],
        ["dark", p.dark],
      ] as const) {
        const ratio = contrastRatio(variant.highlight, variant.background);
        expect(ratio, `${p.id} ${name} highlight-on-bg = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
