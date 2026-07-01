import { useState } from "react";
import { toast } from "sonner";
import { Mail, MessageSquare, FolderKanban, HardDrive, X, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isPreviewEnvironment } from "@/lib/environment";
import {
  MS_SERVICES,
  type MsServiceId,
  getConnections,
  connectService,
  disconnectService,
  isOnboardingDismissed,
  dismissOnboarding,
} from "@/lib/demoConnectionsStore";
import { startConnect } from "@/components/integrations/outlook/outlook-api";
import { useOutlookConnection } from "@/components/integrations/outlook/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ICONS: Record<MsServiceId, LucideIcon> = {
  outlook: Mail,
  teams: MessageSquare,
  sharepoint: FolderKanban,
  onedrive: HardDrive,
};

export function Microsoft365Connections() {
  const { profile } = useAuth();
  const userId = profile?.user_id ?? "";
  const preview = isPreviewEnvironment();

  const qc = useQueryClient();
  const { data: msConn } = useOutlookConnection();
  const [demoConnected, setDemoConnected] = useState<MsServiceId[]>(() => getConnections(userId));
  const connected: MsServiceId[] = preview
    ? demoConnected
    : msConn
      ? MS_SERVICES.map((svc) => svc.id)
      : [];
  const [onboardingHidden, setOnboardingHidden] = useState(false);

  const showOnboarding =
    !onboardingHidden && connected.length === 0 && !isOnboardingDismissed(userId);

  const connect = async (id: MsServiceId, name: string) => {
    if (preview) {
      setDemoConnected(connectService(userId, id));
      toast.success(`Connected ${name}`);
      return;
    }
    try {
      const { authorizeUrl } = await startConnect(
        window.location.origin + window.location.pathname,
      );
      window.location.href = authorizeUrl;
    } catch (e) {
      toast.error("Couldn't start Microsoft connection", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const disconnect = async (id: MsServiceId, name: string) => {
    if (preview) {
      setDemoConnected(disconnectService(userId, id));
      toast.success(`Disconnected ${name}`);
      return;
    }
    try {
      await supabase.from("ms_connections").delete().not("id", "is", null);
      await qc.invalidateQueries({ queryKey: ["outlook", "connection"] });
      toast.success("Disconnected Microsoft 365");
    } catch (e) {
      toast.error("Couldn't disconnect", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const dismiss = () => {
    dismissOnboarding(userId);
    setOnboardingHidden(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Connections</CardTitle>
        <p className="text-xs text-muted-foreground">
          Link Microsoft 365 services to enrich requests across the hub.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {showOnboarding && (
          <div className="flex items-start gap-3 rounded-lg border border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.10)] p-4">
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Connect your Microsoft 365 account
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Sync calendar, files, and meetings to power your requests automatically.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => connect("outlook", "Outlook")}
              >
                Connect Microsoft 365
              </Button>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-[hsl(var(--primary)/0.12)] hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <ul className="divide-y divide-border">
          {MS_SERVICES.map((service) => {
            const Icon = ICONS[service.id];
            const isConnected = connected.includes(service.id);
            return (
              <li
                key={service.id}
                className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted)/0.5)] text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{service.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{service.description}</p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    isConnected
                      ? "rounded-full border-transparent bg-[hsl(var(--status-success)/0.14)] text-[hsl(var(--status-success))]"
                      : "rounded-full border-transparent bg-[hsl(var(--muted)/0.5)] text-muted-foreground"
                  }
                >
                  {isConnected ? "Connected" : "Not connected"}
                </Badge>
                {isConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => disconnect(service.id, service.name)}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => connect(service.id, service.name)}
                  >
                    Connect
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
