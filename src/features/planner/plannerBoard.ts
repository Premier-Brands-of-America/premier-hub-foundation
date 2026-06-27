/**
 * Pure, immutable Kanban board operations. No React, no I/O — fully unit-tested.
 * Each mutator returns a NEW board; ids are supplied by an injectable `newId`
 * so the functions stay deterministic and testable.
 */
import type { Board, Bucket, PlannerCard } from "./types";

type IdFn = () => string;

function sortByPosition<T extends { position: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.position - b.position);
}

/** Cards in a bucket, ordered by position. */
export function cardsInBucket(board: Board, bucketId: string): PlannerCard[] {
  return sortByPosition(board.cards.filter((c) => c.bucketId === bucketId));
}

/** Buckets ordered by position. */
export function orderedBuckets(board: Board): Bucket[] {
  return sortByPosition(board.buckets);
}

export function addBucket(board: Board, name: string, newId: IdFn): Board {
  const position = board.buckets.length
    ? Math.max(...board.buckets.map((b) => b.position)) + 1
    : 0;
  const bucket: Bucket = { id: newId(), name: name.trim() || "New bucket", position };
  return { ...board, buckets: [...board.buckets, bucket] };
}

export function renameBucket(board: Board, bucketId: string, name: string): Board {
  return {
    ...board,
    buckets: board.buckets.map((b) =>
      b.id === bucketId ? { ...b, name: name.trim() || b.name } : b,
    ),
  };
}

/** Remove a bucket and all of its cards. */
export function removeBucket(board: Board, bucketId: string): Board {
  return {
    ...board,
    buckets: board.buckets.filter((b) => b.id !== bucketId),
    cards: board.cards.filter((c) => c.bucketId !== bucketId),
  };
}

/** Move a bucket to a new index (left/right reorder). */
export function reorderBucket(board: Board, bucketId: string, toIndex: number): Board {
  const ordered = orderedBuckets(board);
  const from = ordered.findIndex((b) => b.id === bucketId);
  if (from === -1) return board;
  const clamped = Math.max(0, Math.min(toIndex, ordered.length - 1));
  const [moved] = ordered.splice(from, 1);
  ordered.splice(clamped, 0, moved);
  return {
    ...board,
    buckets: ordered.map((b, i) => ({ ...b, position: i })),
  };
}

export function addCard(
  board: Board,
  bucketId: string,
  partial: Partial<PlannerCard>,
  newId: IdFn,
): Board {
  const existing = cardsInBucket(board, bucketId);
  const position = existing.length;
  const card: PlannerCard = {
    id: newId(),
    bucketId,
    kind: "task",
    title: "Untitled",
    status: "not_started",
    priority: "medium",
    checklist: [],
    attachments: [],
    comments: [],
    position,
    ...partial,
    // ensure bucket/position are authoritative
    bucketId,
    position: partial.position ?? position,
  };
  return { ...board, cards: [...board.cards, card] };
}

export function updateCard(
  board: Board,
  cardId: string,
  patch: Partial<PlannerCard>,
): Board {
  return {
    ...board,
    cards: board.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)),
  };
}

export function removeCard(board: Board, cardId: string): Board {
  return { ...board, cards: board.cards.filter((c) => c.id !== cardId) };
}

/**
 * Move a card to a target bucket at a target index, re-packing positions in
 * both the source and destination buckets so they stay contiguous (0..n).
 */
export function moveCard(
  board: Board,
  cardId: string,
  toBucketId: string,
  toIndex: number,
): Board {
  const card = board.cards.find((c) => c.id === cardId);
  if (!card) return board;
  const fromBucketId = card.bucketId;

  // Destination list without the moved card.
  const dest = cardsInBucket(board, toBucketId).filter((c) => c.id !== cardId);
  const clamped = Math.max(0, Math.min(toIndex, dest.length));
  dest.splice(clamped, 0, { ...card, bucketId: toBucketId });

  // Source list (if different bucket) without the moved card.
  const repacked = new Map<string, number>();
  dest.forEach((c, i) => repacked.set(c.id, i));

  let sourceRepack = new Map<string, number>();
  if (fromBucketId !== toBucketId) {
    const src = cardsInBucket(board, fromBucketId).filter((c) => c.id !== cardId);
    sourceRepack = new Map(src.map((c, i) => [c.id, i]));
  }

  return {
    ...board,
    cards: board.cards.map((c) => {
      if (c.id === cardId) {
        return { ...c, bucketId: toBucketId, position: repacked.get(cardId) ?? 0 };
      }
      if (c.bucketId === toBucketId && repacked.has(c.id)) {
        return { ...c, position: repacked.get(c.id)! };
      }
      if (fromBucketId !== toBucketId && c.bucketId === fromBucketId && sourceRepack.has(c.id)) {
        return { ...c, position: sourceRepack.get(c.id)! };
      }
      return c;
    }),
  };
}
