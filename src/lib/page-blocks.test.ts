import { describe, it, expect } from "vitest";
import {
  splitIntoBlocks,
  joinBlocks,
  classifyBlock,
  turnInto,
  toggleTodo,
  isTodoBlock,
} from "./page-blocks";

/** Normalize the way joinBlocks does so round-trip comparisons are fair. */
function normalize(md: string): string {
  return splitIntoBlocks(md)
    .map((b) => b.src.replace(/\s+$/g, ""))
    .filter((s) => s.length > 0)
    .join("\n\n");
}

describe("splitIntoBlocks / joinBlocks round-trip", () => {
  const cases: Array<[string, string]> = [
    ["single paragraph", "Hello world."],
    ["two paragraphs", "First paragraph.\n\nSecond paragraph."],
    ["heading + body", "# Title\n\nA paragraph under it."],
    [
      "bulleted list stays one block",
      "- one\n- two\n- three",
    ],
    [
      "numbered list stays one block",
      "1. one\n2. two\n3. three",
    ],
    [
      "todo list",
      "- [ ] open task\n- [x] done task",
    ],
    [
      "blockquote",
      "> a quote line\n> second quote line",
    ],
    [
      "callout (emoji blockquote)",
      "> 💡 remember this",
    ],
    [
      "table stays intact",
      "| a | b |\n| --- | --- |\n| 1 | 2 |",
    ],
    [
      "fenced code block keeps its inner blank lines",
      "```ts\nconst a = 1;\n\nconst b = 2;\n```",
    ],
    [
      "mixed doc",
      "# Heading\n\nIntro paragraph with a [[page:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee]] link.\n\n- bullet a\n- bullet b\n\n> a quote",
    ],
  ];

  for (const [name, md] of cases) {
    it(`is lossless for: ${name}`, () => {
      const blocks = splitIntoBlocks(md);
      expect(joinBlocks(blocks)).toBe(normalize(md));
    });
  }

  it("keeps a meet fence as a single block", () => {
    const md = '```meet\n{"subject":"Sync"}\n```';
    const blocks = splitIntoBlocks(md);
    const meets = blocks.filter((b) => b.kind === "meet");
    expect(meets).toHaveLength(1);
    expect(meets[0].src).toBe(md);
  });

  it("keeps a view fence as a single block", () => {
    const md = '```view\n{"source":"tasks","filter":"open"}\n```';
    const blocks = splitIntoBlocks(md);
    const views = blocks.filter((b) => b.kind === "view");
    expect(views).toHaveLength(1);
    expect(views[0].src).toBe(md);
  });

  it("never splits a meet/view fence mid-fence even with blank lines inside", () => {
    const md = '```meet\n{\n  "subject": "Sync",\n\n  "status": "pending"\n}\n```';
    const blocks = splitIntoBlocks(md);
    expect(blocks.filter((b) => b.kind === "meet")).toHaveLength(1);
    expect(joinBlocks(blocks)).toBe(md);
  });

  it("interleaves prose and fenced blocks losslessly", () => {
    const md =
      'Intro paragraph.\n\n```view\n{"source":"tasks"}\n```\n\nMiddle note.\n\n```meet\n{"subject":"X"}\n```\n\nOutro.';
    const blocks = splitIntoBlocks(md);
    expect(blocks.map((b) => b.kind)).toEqual(["md", "view", "md", "meet", "md"]);
    expect(joinBlocks(blocks)).toBe(md);
  });

  it("collapses extra blank lines between blocks", () => {
    const md = "First.\n\n\n\nSecond.";
    expect(joinBlocks(splitIntoBlocks(md))).toBe("First.\n\nSecond.");
  });

  it("yields a single empty block for empty input", () => {
    expect(splitIntoBlocks("")).toHaveLength(1);
    expect(splitIntoBlocks("   \n  ")).toHaveLength(1);
    expect(joinBlocks(splitIntoBlocks(""))).toBe("");
  });

  it("assigns unique ids", () => {
    const blocks = splitIntoBlocks("a\n\nb\n\nc");
    const ids = new Set(blocks.map((b) => b.id));
    expect(ids.size).toBe(blocks.length);
  });
});

describe("classifyBlock", () => {
  it("recognizes headings, lists, quotes, callouts", () => {
    expect(classifyBlock("# H")).toBe("h1");
    expect(classifyBlock("## H")).toBe("h2");
    expect(classifyBlock("### H")).toBe("h3");
    expect(classifyBlock("- item")).toBe("bullet");
    expect(classifyBlock("1. item")).toBe("numbered");
    expect(classifyBlock("- [ ] todo")).toBe("todo");
    expect(classifyBlock("- [x] done")).toBe("todo");
    expect(classifyBlock("> quote")).toBe("quote");
    expect(classifyBlock("> 💡 tip")).toBe("callout");
    expect(classifyBlock("```\ncode\n```")).toBe("code");
    expect(classifyBlock("---")).toBe("divider");
    expect(classifyBlock("plain text")).toBe("paragraph");
  });
});

describe("turnInto", () => {
  it("converts a paragraph to a heading and back", () => {
    expect(turnInto("hello", "h2")).toBe("## hello");
    expect(turnInto("## hello", "paragraph")).toBe("hello");
  });
  it("swaps between list types preserving text", () => {
    expect(turnInto("- a bullet", "numbered")).toBe("1. a bullet");
    expect(turnInto("1. a number", "todo")).toBe("- [ ] a number");
    expect(turnInto("- [ ] a todo", "quote")).toBe("> a todo");
  });
  it("makes a callout", () => {
    expect(turnInto("note", "callout")).toBe("> 💡 note");
  });
});

describe("toggleTodo / isTodoBlock", () => {
  it("detects to-do blocks", () => {
    expect(isTodoBlock("- [ ] x")).toBe(true);
    expect(isTodoBlock("- [x] x")).toBe(true);
    expect(isTodoBlock("- plain")).toBe(false);
  });
  it("toggles the checkbox", () => {
    expect(toggleTodo("- [ ] task")).toBe("- [x] task");
    expect(toggleTodo("- [x] task")).toBe("- [ ] task");
    expect(toggleTodo("- [X] task")).toBe("- [ ] task");
  });
  it("leaves non-todo blocks untouched", () => {
    expect(toggleTodo("just text")).toBe("just text");
  });
});
