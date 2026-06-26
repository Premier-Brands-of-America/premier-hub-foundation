import { useState } from "react";
import { ExternalLink, FolderSync, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { useQueryClient } from "@tanstack/react-query";
import { requestKeys } from "@/hooks/useRequests";
import { toast } from "sonner";

interface Props {
  requestId: string;
  folderUrl: string | null;
}

export function SharePointPanel({ requestId, folderUrl }: Props) {
  const role = useRole();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const isAdmin = role === "admin";

  const handleProvision = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "sharepoint-provision",
        { body: { request_id: requestId } },
      );
      if (error) throw error;
      toast.success("SharePoint folder ready");
      qc.invalidateQueries({ queryKey: requestKeys.detail(requestId) });
      if ((data as { url?: string })?.url) {
        window.open((data as { url: string }).url, "_blank", "noopener");
      }
    } catch (e) {
      toast.error("Provisioning failed", {
        description: (e as Error).message,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(var(--entity-request)/0.12)] text-[hsl(var(--entity-request))]"
            aria-hidden
          >
            <FolderSync className="h-4 w-4" />
          </span>
          SharePoint
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {folderUrl ? (
          <Button asChild variant="outline" size="sm" className="w-full justify-center gap-2">
            <a href={folderUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open folder
            </a>
          </Button>
        ) : (
          <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-3 text-center text-xs text-muted-foreground">
            No SharePoint folder yet.
          </p>
        )}
        {(isAdmin || !folderUrl) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleProvision}
            disabled={busy}
            className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderSync className="h-4 w-4" />
            )}
            {folderUrl ? "Re-provision" : "Provision folder"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}