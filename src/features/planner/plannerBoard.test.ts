import { describe, it, expect } from "vitest";
import {
  addBucket,
  renameBucket,
  removeBucket,
  reorderBucket,
  addCard,
  moveCard,
  updateCard,
  cardsInBucket,
  orderedBuckets,
} from "./plannerBoard";
import type { Board } from "./types";

let counter = 0;
const newId = () => `id-${++counter}`;

function baseBoard(): Board {
  counter = 0;
  let b: Board = {
    projectId: "p1",
    projectTitle: "Demo",
    buckets: [
      { id: "b1", name: "To do", position: 0 },
      { id: "b2", name: "Doing", position: 1 },
    ],
    cards: [
      { id: "c1", bucketId: "b1", kind: "task", title: "A", status: "not_started", priority: "medium", checklist: [], attachments: [], comments: [], position: 0 },
      { id: "c2", bucketId: "b1", kind: "task", title: "B", status: "not_started", priority: "medium", checklist: [], attachments: [], comments: [], position: 1 },
      { id: "c3", bucketId: "b2", kind: "task", title: "C", status: "in_progress", priority: "high", checklist: [], attachments: [], comments: [], position: 0 },
    ],
  };
  return b;
}

describe("bucket operations", () => {
  it("adds a bucket at the end", () => {
    const b = addBucket(baseBoard(), "Done", newId);
    const ordered = orderedBuckets(b);
    expect(ordered).toHaveLength(3);
    expect(ordered[2].name).toBe("Done");
    expect(ordered[2].position).toBe(2);
  });
  it("renames a bucket", () => {
    const b = renameBucket(baseBoard(), "b1", "Backlog");
    expect(b.buckets.find((x) => x.id === "b1")!.name).toBe("Backlog");
  });
  it("removes a bucket and its cards", () => {
    const b = removeBucket(baseBoard(), "b1");
    expect(b.buckets).toHaveLength(1);
    expect(b.cards.every((c) => c.bucketId !== "b1")).toBe(true);
    expect(b.cards).toHaveLength(1);
  });
  it("reorders buckets and re-packs positions", () => {
    const b = reorderBucket(baseBoard(), "b2", 0);
    const ordered = orderedBuckets(b);
    expect(ordered.map((x) => x.id)).toEqual(["b2", "b1"]);
    expect(ordered.map((x) => x.position)).toEqual([0, 1]);
  });
});

describe("card operations", () => {
  it("adds a card to the end of a bucket", () => {
    const b = addCard(baseBoard(), "b1", { title: "New" }, newId);
    const cards = cardsInBucket(b, "b1");
    expect(cards).toHaveLength(3);
    expect(cards[2].title).toBe("New");
    expect(cards[2].position).toBe(2);
  });
  it("updates a card", () => {
    const b = updateCard(baseBoard(), "c1", { status: "completed" });
    expect(b.cards.find((c) => c.id === "c1")!.status).toBe("completed");
  });
});

describe("moveCard", () => {
  it("moves a card to another bucket and re-packs both sides", () => {
    const b = moveCard(baseBoard(), "c1", "b2", 0);
    const dst = cardsInBucket(b, "b2");
    const src = cardsInBucket(b, "b1");
    expect(dst.map((c) => c.id)).toEqual(["c1", "c3"]);
    expect(dst.map((c) => c.position)).toEqual([0, 1]);
    // source re-packed contiguously
    expect(src.map((c) => c.id)).toEqual(["c2"]);
    expect(src[0].position).toBe(0);
  });
  it("reorders within the same bucket", () => {
    const b = moveCard(baseBoard(), "c2", "b1", 0);
    const cards = cardsInBucket(b, "b1");
    expect(cards.map((c) => c.id)).toEqual(["c2", "c1"]);
    expect(cards.map((c) => c.position)).toEqual([0, 1]);
  });
  it("clamps an out-of-range index", () => {
    const b = moveCard(baseBoard(), "c3", "b1", 99);
    const cards = cardsInBucket(b, "b1");
    expect(cards[cards.length - 1].id).toBe("c3");
  });
});
