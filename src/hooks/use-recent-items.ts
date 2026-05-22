import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export interface RecentItem {
  entity_type: "project" | "task" | "request" | "page" | "user";
  id: string;
  title: string;
  visited_at: number;
}

const MAX = 10;

function storageKey(userId: string | null | undefined) {
  return `phv2:recents:${userId ?? "anon"}`;
}

function read(userId: string | null | undefined): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX);
  } catch {
    return [];
  }
}

export function useRecentItems() {
  const { profile } = useAuth();
  const userId = profile?.user_id ?? null;
  const [items, setItems] = useState<RecentItem[]>(() => read(userId));

  useEffect(() => {
    setItems(read(userId));
  }, [userId]);

  const push = useCallback(
    (item: Omit<RecentItem, "visited_at">) => {
      if (typeof window === "undefined") return;
      const next: RecentItem[] = [
        { ...item, visited_at: Date.now() },
        ...items.filter(
          (i) => !(i.entity_type === item.entity_type && i.id === item.id),
        ),
      ].slice(0, MAX);
      setItems(next);
      try {
        window.localStorage.setItem(storageKey(userId), JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
    },
    [items, userId],
  );

  const clear = useCallback(() => {
    setItems([]);
    try {
      window.localStorage.removeItem(storageKey(userId));
    } catch {
      /* ignore */
    }
  }, [userId]);

  return { items, push, clear };
}