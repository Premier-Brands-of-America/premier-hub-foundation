import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, CheckCircle2, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";

const TYPE_STYLE: Record<string, { icon: typeof Info; color: string }> = {
  warning: { icon: AlertTriangle, color: "hsl(var(--status-warning))" },
  success: { icon: CheckCircle2, color: "hsl(var(--status-success))" },
  info: { icon: Info, color: "hsl(var(--status-info))" },
};

/** Header notification bell: unread badge + popover list; click navigates + marks read. */
export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const open = (n: AppNotification) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-foreground/5"
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
              style={{ backgroundColor: "hsl(var(--status-info))" }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => markAllRead.mutate()}
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => {
                const s = TYPE_STYLE[n.type] ?? TYPE_STYLE.info;
                const Icon = s.icon;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => open(n)}
                      className={`flex w-full gap-2.5 px-3 py-2.5 text-left hover:bg-muted/50 ${n.is_read ? "opacity-70" : ""}`}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: s.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {!n.is_read && (
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: "hsl(var(--status-info))" }}
                            />
                          )}
                          <span className="truncate text-sm font-medium text-foreground">{n.title}</span>
                        </div>
                        {n.message && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                        )}
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
