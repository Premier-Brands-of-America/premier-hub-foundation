/**
 * Planner board hook — PRODUCTION Supabase source of truth. Exposes the SAME
 * controller interface as `usePlannerBoard` (the demo/localStorage hook) so the
 * Kanban UI is agnostic to the backend.
 *
 * The board is loaded via TanStack Query and mirrored into local state so each
 * mutation can apply the pure `ops.*` transform for an instant, optimistic UI.
 * The SAME client-generated id is passed to Supabase so the optimistic row and
 * the persisted row stay in sync. On persistence error we toast + refetch.
 */
import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { Board, PlannerCard } from "./types";
import * as ops from "./plannerBoard";
import * as db from "./plannerSupabase";

const EMPTY_BOARD: Board = { projectId: "", projectTitle: "", buckets: [], cards: [] };

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Math.random().toString(36).slice(2)}`;
  }
}

export function usePlannerBoardSupabase(projectId: string) {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const userId = user?.id ?? profile?.user_id ?? "";
  const queryKey = ["planner", "board", projectId];

  const query = useQuery({
    queryKey,
    queryFn: () => db.fetchBoard(projectId),
    enabled: !!projectId,
  });

  const [board, setBoard] = useState<Board>(EMPTY_BOARD);

  // Re-seed local state whenever the fetched board changes (load / refetch).
  useEffect(() => {
    if (query.data) setBoard(query.data);
  }, [query.data]);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, projectId]);

  const onError = useCallback(
    (message: string) => (err: unknown) => {
      console.error(message, err);
      toast.error(message);
      refetch();
    },
    [refetch],
  );

  const addBucket = useCallback(
    (name: string) => {
      const id = newId();
      let created: { id: string; name: string; position: number } | undefined;
      setBoard((b) => {
        const next = ops.addBucket(b, name, () => id);
        created = next.buckets.find((x) => x.id === id);
        return next;
      });
      if (created) {
        db.insertBucket({ id, projectId, name: created.name, position: created.position }).catch(
          onError("Could not add bucket"),
        );
      }
    },
    [projectId, onError],
  );

  const renameBucket = useCallback(
    (id: string, name: string) => {
      setBoard((b) => ops.renameBucket(b, id, name));
      db.updateBucketName(id, name.trim()).catch(onError("Could not rename bucket"));
    },
    [onError],
  );

  const removeBucket = useCallback(
    (id: string) => {
      setBoard((b) => ops.removeBucket(b, id));
      db.deleteBucket(id).catch(onError("Could not delete bucket"));
    },
    [onError],
  );

  const reorderBucket = useCallback(
    (id: string, toIndex: number) => {
      let buckets: Board["buckets"] = [];
      setBoard((b) => {
        const next = ops.reorderBucket(b, id, toIndex);
        buckets = next.buckets;
        return next;
      });
      db.updateBucketPositions(buckets).catch(onError("Could not reorder buckets"));
    },
    [onError],
  );

  const addCard = useCallback(
    (bucketId: string, partial: Partial<PlannerCard>) => {
      const id = newId();
      let created: PlannerCard | undefined;
      setBoard((b) => {
        const next = ops.addCard(b, bucketId, partial, () => id);
        created = next.cards.find((c) => c.id === id);
        return next;
      });
      if (created) {
        db.insertCard({ card: created, projectId, userId }).catch(onError("Could not add card"));
      }
    },
    [projectId, userId, onError],
  );

  const updateCard = useCallback(
    (id: string, patch: Partial<PlannerCard>) => {
      setBoard((b) => ops.updateCard(b, id, patch));
      db.updateCardRow(id, patch).catch(onError("Could not save card"));
    },
    [onError],
  );

  const removeCard = useCallback(
    (id: string) => {
      setBoard((b) => ops.removeCard(b, id));
      db.deleteCardRow(id).catch(onError("Could not delete card"));
    },
    [onError],
  );

  const moveCard = useCallback(
    (id: string, toBucketId: string, toIndex: number) => {
      let moved: PlannerCard | undefined;
      setBoard((b) => {
        const next = ops.moveCard(b, id, toBucketId, toIndex);
        moved = next.cards.find((c) => c.id === id);
        return next;
      });
      if (moved) {
        db.moveCardRow(id, toBucketId, moved.position).catch(onError("Could not move card"));
      }
    },
    [onError],
  );

  // In production "reset" must NOT wipe to a demo board — it re-fetches truth.
  const reset = useCallback(() => refetch(), [refetch]);

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
