// Preview/demo persistence for in-app notifications (no live DB in preview).
// Backed by localStorage and keyed by recipient user_id, so the break-glass
// owner-notification (and any other trigger) is observable in the bell when
// signed in as that user. Mirrors the `public.notifications` row shape.

/** The notification shape the bell renders — a subset of the notifications row. */
export interface AppNotification {
  id: string;
  user_id: string;
  type: string; // 'info' | 'success' | 'warning'
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const KEY = "phv2:demo-notifications";

function load(): AppNotification[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function save(list: AppNotification[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

// One-time realistic seed per viewer so the bell demonstrates its value in
// preview (an empty feed read as "the notifications feature is dead"). Seeds
// the kinds of events the hub actually generates: assignment, status change,
// @mention, comment, and a due-soon nudge. Prod is untouched.
const SEEDED_KEY = "phv2:demo-notifications-seeded";

function minsAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

function seedFor(userId: string): AppNotification[] {
  const mk = (
    n: number,
    type: string,
    title: string,
    message: string,
    link: string | null,
    mins: number,
    is_read = false,
  ): AppNotification => ({
    id: `demo-notif-seed-${userId}-${n}`,
    user_id: userId,
    type,
    title,
    message,
    link,
    is_read,
    created_at: minsAgo(mins),
  });
  return [
    mk(1, "warning", "CVS Caring Mill label proof is overdue", "ART-1003 was due yesterday — Megan is assigned.", "/requests/demo-seed-cvs", 8),
    mk(2, "info", "You were assigned Target holiday cap art", "Jaclyn routed ART-1005 to you · due tomorrow.", "/requests/demo-seed-target", 42),
    mk(3, "info", "Dan mentioned you on Trojan promo banner set", '"@Alex can you confirm the dieline before proofing?"', "/requests/demo-seed-trojan", 95),
    mk(4, "success", "Whole Foods signage moved to Proofing", "Megan advanced ART-1010 — 2 proofs waiting on you.", "/queue", 180, true),
    mk(5, "warning", "3 art requests are due this week", "Kroger, Publix, and Sephora deliverables land before Friday.", "/reports", 320, true),
  ];
}

/** Notifications for a recipient, newest-first (seeds a demo feed once). */
export function demoListNotifications(userId: string): AppNotification[] {
  if (userId) {
    try {
      const seeded = JSON.parse(localStorage.getItem(SEEDED_KEY) || "{}") as Record<string, boolean>;
      if (!seeded[userId]) {
        save([...seedFor(userId), ...load()]);
        seeded[userId] = true;
        localStorage.setItem(SEEDED_KEY, JSON.stringify(seeded));
      }
    } catch {
      /* noop — seeding is best-effort */
    }
  }
  return load()
    .filter((n) => n.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function demoUnreadCount(userId: string): number {
  return demoListNotifications(userId).filter((n) => !n.is_read).length;
}

/** Push a notification to a recipient's feed. */
export function demoPushNotification(
  n: Omit<AppNotification, "id" | "is_read" | "created_at"> & { created_at?: string },
): AppNotification {
  const row: AppNotification = {
    id: "demo-notif-" + Date.now() + "-" + Math.round(Math.random() * 1e6),
    is_read: false,
    created_at: n.created_at ?? new Date().toISOString(),
    user_id: n.user_id,
    type: n.type,
    title: n.title,
    message: n.message ?? null,
    link: n.link ?? null,
  };
  save([row, ...load()]);
  return row;
}

export function demoMarkNotificationRead(id: string): void {
  const list = load();
  const i = list.findIndex((n) => n.id === id);
  if (i >= 0) {
    list[i] = { ...list[i], is_read: true };
    save(list);
  }
}

export function demoMarkAllNotificationsRead(userId: string): void {
  save(load().map((n) => (n.user_id === userId ? { ...n, is_read: true } : n)));
}
