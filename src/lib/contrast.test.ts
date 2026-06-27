import { describe, it, expect } from "vitest";
import {
  parseToRgb,
  rgbToHsl,
  hslToRgb,
  hslToTokenTriple,
  rgbToHex,
  contrastRatio,
  meetsWcagAA,
  nearestPassingForeground,
} from "./contrast";

describe("parseToRgb", () => {
  it("parses hex (#rgb and #rrggbb)", () => {
    expect(parseToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses token triples and hsl()", () => {
    expect(parseToRgb("0 0% 100%")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseToRgb("0 0% 0%")).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseToRgb("hsl(0 0% 100%)")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("parses rgb()", () => {
    expect(parseToRgb("rgb(255, 0, 0)")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("returns null for garbage", () => {
    expect(parseToRgb("not-a-color")).toBeNull();
    expect(parseToRgb("")).toBeNull();
  });
});

describe("hsl <-> rgb round-trips", () => {
  it("survives a round-trip within rounding", () => {
    const rgb = { r: 18, g: 19, b: 23 }; // ≈ token --card dark
    const back = hslToRgb(rgbToHsl(rgb));
    expect(Math.abs(back.r - rgb.r)).toBeLessThanOrEqual(2);
    expect(Math.abs(back.g - rgb.g)).toBeLessThanOrEqual(2);
    expect(Math.abs(back.b - rgb.b)).toBeLessThanOrEqual(2);
  });

  it("formats token triples and hex", () => {
    expect(hslToTokenTriple({ h: 228, s: 12, l: 92 })).toBe("228 12% 92%");
    expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe("#ff0000");
  });
});

describe("contrastRatio", () => {
  it("black on white is 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("identical colors are 1:1", () => {
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("is order-independent", () => {
    expect(contrastRatio("#123456", "#abcdef")).toBeCloseTo(
      contrastRatio("#abcdef", "#123456"),
      6,
    );
  });

  it("works on token triples (dark theme defaults pass AA)", () => {
    // --foreground 228 12% 92% on --background 228 12% 3%
    expect(contrastRatio("228 12% 92%", "228 12% 3%")).toBeGreaterThan(4.5);
  });
});

describe("meetsWcagAA", () => {
  it("passes high contrast, fails low contrast for normal text", () => {
    expect(meetsWcagAA("#000000", "#ffffff")).toBe(true);
    expect(meetsWcagAA("#999999", "#ffffff")).toBe(false); // ~2.8:1
  });

  it("uses the 3:1 threshold for large text", () => {
    // grey ~4.0:1 fails normal but passes large
    expect(meetsWcagAA("#767676", "#ffffff", false)).toBe(true);
    expect(meetsWcagAA("#949494", "#ffffff", false)).toBe(false);
    expect(meetsWcagAA("#949494", "#ffffff", true)).toBe(true);
  });
});

describe("nearestPassingForeground", () => {
  it("returns the original unchanged when it already passes", () => {
    const r = nearestPassingForeground("#000000", "#ffffff");
    expect(r).not.toBeNull();
    expect(r!.adjusted).toBe(false);
    expect(r!.ratio).toBeGreaterThan(4.5);
  });

  it("darkens a too-light foreground on white until AA passes", () => {
    const r = nearestPassingForeground("#bbbbbb", "#ffffff");
    expect(r).not.toBeNull();
    expect(r!.adjusted).toBe(true);
    expect(r!.ratio).toBeGreaterThanOrEqual(4.5);
    expect(meetsWcagAA(r!.hex, "#ffffff")).toBe(true);
  });

  it("lightens a too-dark foreground on black until AA passes", () => {
    const r = nearestPassingForeground("#333333", "#000000");
    expect(r).not.toBeNull();
    expect(r!.adjusted).toBe(true);
    expect(meetsWcagAA(r!.triple, "0 0% 0%")).toBe(true);
  });

  it("returns a token triple that itself meets AA", () => {
    const r = nearestPassingForeground("#888888", "#111111");
    expect(meetsWcagAA(r!.triple, "#111111")).toBe(true);
  });

  it("returns null for an unparseable foreground", () => {
    expect(nearestPassingForeground("garbage", "#fff")).toBeNull();
  });
});
