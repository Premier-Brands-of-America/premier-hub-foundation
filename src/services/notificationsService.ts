/**
 * In-app notifications data layer. Production reads/writes the `notifications`
 * table (RLS-scoped to the recipient); preview uses the localStorage demo store.
 */
import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import {
  demoListNotifications,
  demoMarkAllNotificationsRead,
  demoMarkNotificationRead,
  type AppNotification,
} from "@/lib/demoNotificationsStore";

const IS_PREVIEW = isPreviewEnvironment();
const FIELDS = "id, user_id, type, title, message, link, is_read, created_at";

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  if (IS_PREVIEW) return demoListNotifications(userId);
  const { data, error } = await supabase
    .from("notifications")
    .select(FIELDS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  if (IS_PREVIEW) {
    demoMarkNotificationRead(id);
    return;
  }
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (IS_PREVIEW) {
    demoMarkAllNotificationsRead(userId);
    return;
  }
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
}

export type { AppNotification };
