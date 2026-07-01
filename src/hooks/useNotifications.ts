import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeInvalidation } from "@/hooks/use-realtime";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/services/notificationsService";

/** The signed-in user's notifications (bell/list), with unread count + mutations. */
export function useNotifications() {
  const { user, profile } = useAuth();
  const userId = user?.id ?? profile?.user_id ?? "";
  const qc = useQueryClient();

  useRealtimeInvalidation("notifications", ["notifications"]);

  const query = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => fetchNotifications(userId),
    enabled: !!userId,
    refetchInterval: 60_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications", userId] });

  const markRead = useMutation({ mutationFn: (id: string) => markNotificationRead(id), onSuccess: invalidate });
  const markAllRead = useMutation({ mutationFn: () => markAllNotificationsRead(userId), onSuccess: invalidate });

  const notifications = useMemo(() => query.data ?? [], [query.data]);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  return { notifications, unreadCount, isLoading: query.isLoading, markRead, markAllRead };
}

export type { AppNotification };
