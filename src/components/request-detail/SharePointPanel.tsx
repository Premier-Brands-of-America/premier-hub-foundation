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
      <CardHeader>
        <CardTitle className="text-base">SharePoint</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        {folderUrl ? (
          <Button asChild variant="outline" size="sm">
            <a href={folderUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open folder
            </a>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            No SharePoint folder yet.
          </p>
        )}
        {(isAdmin || !folderUrl) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleProvision}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FolderSync className="mr-2 h-4 w-4" />
            )}
            {folderUrl ? "Re-provision" : "Provision folder"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}