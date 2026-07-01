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

/** Notifications for a recipient, newest-first. */
export function demoListNotifications(userId: string): AppNotification[] {
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
