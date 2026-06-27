/**
 * Planner board state hook. Backs the Kanban UI with the pure board operations
 * and persists to localStorage so a reviewer's changes survive a refresh.
 *
 * In preview/mock mode this is the source of truth (demo data). When the app is
 * deployed and types are regenerated, a Supabase-backed loader can hydrate the
 * same shape (see DECISIONS.md / docs for the deploy path).
 */
import { useCallback, useEffect, useState } from "react";
import type { Board, PlannerCard } from "./types";
import { demoBoard } from "./demoData";
import * as ops from "./plannerBoard";

const STORAGE_PREFIX = "planner-board:";

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Math.random().toString(36).slice(2)}`;
  }
}

function load(projectId: string): Board {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + projectId);
    if (raw) return JSON.parse(raw) as Board;
  } catch {
    /* ignore corrupt storage */
  }
  return demoBoard();
}

export function usePlannerBoard(projectId = "demo-project") {
  const [board, setBoard] = useState<Board>(() => load(projectId));

  useEffect(() => {
    setBoard(load(projectId));
  }, [projectId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + projectId, JSON.stringify(board));
    } catch {
      /* storage may be unavailable */
    }
  }, [projectId, board]);

  const addBucket = useCallback(
    (name: string) => setBoard((b) => ops.addBucket(b, name, newId)),
    [],
  );
  const renameBucket = useCallback(
    (id: string, name: string) => setBoard((b) => ops.renameBucket(b, id, name)),
    [],
  );
  const removeBucket = useCallback(
    (id: string) => setBoard((b) => ops.removeBucket(b, id)),
    [],
  );
  const reorderBucket = useCallback(
    (id: string, toIndex: number) => setBoard((b) => ops.reorderBucket(b, id, toIndex)),
    [],
  );
  const addCard = useCallback(
    (bucketId: string, partial: Partial<PlannerCard>) =>
      setBoard((b) => ops.addCard(b, bucketId, partial, newId)),
    [],
  );
  const updateCard = useCallback(
    (id: string, patch: Partial<PlannerCard>) => setBoard((b) => ops.updateCard(b, id, patch)),
    [],
  );
  const removeCard = useCallback(
    (id: string) => setBoard((b) => ops.removeCard(b, id)),
    [],
  );
  const moveCard = useCallback(
    (id: string, toBucketId: string, toIndex: number) =>
      setBoard((b) => ops.moveCard(b, id, toBucketId, toIndex)),
    [],
  );
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_PREFIX + projectId);
    } catch {
      /* ignore */
    }
    setBoard(demoBoard());
  }, [projectId]);

  return {
    board,
    addBucket,
    renameBucket,
    removeBucket,
    reorderBucket,
    addCard,
    updateCard,
    removeCard,
    moveCard,
    reset,
  };
}
