import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isPreviewEnvironment } from "@/lib/environment";
import { defaultLayout } from "./default-layout";
import {
  clampH,
  clampW,
  createWidget,
  moveWidget,
  normalizeLayout,
} from "./layout-utils";
import {
  MAX_H,
  MAX_W,
  MIN_H,
  MIN_W,
  type CardType,
  type DashboardLayoutRow,
  type DashboardWidget,
} from "./types";

const IS_PREVIEW = isPreviewEnvironment();
const SAVE_DEBOUNCE_MS = 600;
const W_STEP = 2;

function storageKey(userId: string | null | undefined): string {
  return `phv2:dashboard-layout:${userId ?? "anon"}`;
}

function isWidgetArray(value: unknown): value is DashboardWidget[] {
  return (
    Array.isArray(value) &&
    value.every((w) => w && typeof w === "object" && "type" in w && "id" in w)
  );
}

function readLocal(userId: string | null | undefined): DashboardWidget[] | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isWidgetArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export interface UseDashboardLayout {
  widgets: DashboardWidget[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  /** True while a debounced/inflight save is pending. */
  isSaving: boolean;
  addCard: (type: CardType) => void;
  removeCard: (id: string) => void;
  /** Drag reorder: move the widget at index `from` to index `to`. */
  moveByIndex: (from: number, to: number) => void;
  /** Keyboard reorder: swap a widget with its previous/next neighbour. */
  nudge: (id: string, dir: "prev" | "next") => void;
  grow: (id: string) => void;
  shrink: (id: string) => void;
  taller: (id: string) => void;
  shorter: (id: string) => void;
  reset: () => void;
}

export function useDashboardLayout(): UseDashboardLayout {
  const { user, profile } = useAuth();
  const userId = user?.id ?? profile?.user_id ?? null;
  const queryClient = useQueryClient();
  const queryKey = ["dashboard-layout", userId] as const;

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<DashboardWidget[]> => {
      if (IS_PREVIEW || !userId) {
        return readLocal(userId) ?? defaultLayout();
      }
      // dashboard_layouts is not in the generated types yet — keep the cast at
      // the `.from()` boundary only (lead regenerates types at P4). `as never`
      // matches the repo convention (see services/requests.ts).
      const { data, error } = await supabase
        .from("dashboard_layouts" as never)
        .select("user_id, layout, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      const row = (data as DashboardLayoutRow | null) ?? null;
      if (row && isWidgetArray(row.layout)) {
        return normalizeLayout(row.layout);
      }
      return defaultLayout();
    },
  });

  const [widgets, setWidgets] = useState<DashboardWidget[] | null>(null);
  const hydrated = useRef(false);

  // Seed working copy once from the loaded layout.
  useEffect(() => {
    if (!hydrated.current && query.data) {
      setWidgets(query.data);
      hydrated.current = true;
    }
  }, [query.data]);

  const save = useMutation({
    mutationFn: async (next: DashboardWidget[]) => {
      if (IS_PREVIEW || !userId) {
        try {
          localStorage.setItem(storageKey(userId), JSON.stringify(next));
        } catch {
          /* ignore quota */
        }
        return;
      }
      const row = {
        user_id: userId,
        layout: next,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("dashboard_layouts" as never)
        .upsert(row as never, { onConflict: "user_id" });
      if (error) throw error;
    },
  });

  const saveRef = useRef(save);
  saveRef.current = save;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Optimistic local update + cache write + debounced persist.
  const commit = useCallback(
    (next: DashboardWidget[], immediate = false) => {
      const normalized = normalizeLayout(next);
      setWidgets(normalized);
      queryClient.setQueryData(queryKey, normalized);
      if (timer.current) clearTimeout(timer.current);
      if (immediate) {
        saveRef.current.mutate(normalized);
      } else {
        timer.current = setTimeout(() => saveRef.current.mutate(normalized), SAVE_DEBOUNCE_MS);
      }
    },
    // queryKey is derived from userId; depend on the primitive instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, userId],
  );

  const current = useMemo(
    () => widgets ?? query.data ?? [],
    [widgets, query.data],
  );

  const addCard = useCallback(
    (type: CardType) => commit([...current, createWidget(type)]),
    [current, commit],
  );

  const removeCard = useCallback(
    (id: string) => commit(current.filter((w) => w.id !== id)),
    [current, commit],
  );

  const moveByIndex = useCallback(
    (from: number, to: number) => commit(moveWidget(current, from, to)),
    [current, commit],
  );

  const nudge = useCallback(
    (id: string, dir: "prev" | "next") => {
      const i = current.findIndex((w) => w.id === id);
      if (i < 0) return;
      const j = dir === "prev" ? i - 1 : i + 1;
      if (j < 0 || j >= current.length) return;
      commit(moveWidget(current, i, j));
    },
    [current, commit],
  );

  const resize = useCallback(
    (id: string, dw: number, dh: number) => {
      const next = current.map((w) =>
        w.id === id
          ? {
              ...w,
              w: clampW(Math.min(MAX_W, Math.max(MIN_W, w.w + dw))),
              h: clampH(Math.min(MAX_H, Math.max(MIN_H, w.h + dh))),
            }
          : w,
      );
      commit(next);
    },
    [current, commit],
  );

  const grow = useCallback((id: string) => resize(id, W_STEP, 0), [resize]);
  const shrink = useCallback((id: string) => resize(id, -W_STEP, 0), [resize]);
  const taller = useCallback((id: string) => resize(id, 0, 1), [resize]);
  const shorter = useCallback((id: string) => resize(id, 0, -1), [resize]);

  const reset = useCallback(() => commit(defaultLayout(), true), [commit]);

  return {
    widgets: current,
    isLoading: query.isLoading && !hydrated.current,
    isError: query.isError,
    refetch: () => query.refetch(),
    isSaving: save.isPending,
    addCard,
    removeCard,
    moveByIndex,
    nudge,
    grow,
    shrink,
    taller,
    shorter,
    reset,
  };
}
