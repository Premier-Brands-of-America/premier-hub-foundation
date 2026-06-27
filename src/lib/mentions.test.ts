import { describe, it, expect } from "vitest";
import {
  parseMentions,
  parseLooseHandles,
  mentionsToPlainText,
  insertMention,
} from "./mentions";

describe("parseMentions", () => {
  it("extracts explicit mentions with ids", () => {
    const text = "Hey @[Jaclyn Doe](u-1) and @[Megan R](u-2), please review.";
    expect(parseMentions(text)).toEqual([
      { userId: "u-1", display: "Jaclyn Doe" },
      { userId: "u-2", display: "Megan R" },
    ]);
  });
  it("dedupes repeated mentions of the same user", () => {
    const text = "@[A](u-1) ping @[A](u-1)";
    expect(parseMentions(text)).toHaveLength(1);
  });
  it("returns [] for empty/plain text", () => {
    expect(parseMentions("")).toEqual([]);
    expect(parseMentions("no mentions here")).toEqual([]);
  });
});

describe("parseLooseHandles", () => {
  it("extracts @handles", () => {
    expect(parseLooseHandles("ping @dan and @megan.r")).toEqual([
      "dan",
      "megan.r",
    ]);
  });
});

describe("mentionsToPlainText", () => {
  it("renders explicit mentions as @Name", () => {
    expect(mentionsToPlainText("hi @[Jaclyn](u-1)!")).toBe("hi @Jaclyn!");
  });
});

describe("insertMention", () => {
  it("replaces a trailing @partial with the explicit token", () => {
    const start = "cc @ja";
    const res = insertMention(start, start.length, {
      userId: "u-1",
      display: "Jaclyn",
    });
    expect(res.text).toBe("cc @[Jaclyn](u-1) ");
    expect(res.caret).toBe(res.text.length);
  });
});
