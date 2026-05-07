import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { getRequest } from "@/services/requests";
import { requestKeys } from "@/hooks/useRequests";
import { AttachmentList } from "@/components/attachments/AttachmentList";
import { AttachmentUploader } from "@/components/attachments/AttachmentUploader";
import { SharePointPanel } from "@/components/request-detail/SharePointPanel";
import { canUploadFiles } from "@/lib/permissions";
import { ATTACHMENT_KINDS, type AttachmentKind } from "@/types/attachment";

function tabsForRole(
  role: ReturnType<typeof useRole>,
  isOwner: boolean,
): AttachmentKind[] {
  if (role === "admin" || role === "designer") return [...ATTACHMENT_KINDS];
  // requester: see all but only upload to submission/reference (uploader gates this)
  if (isOwner) return [...ATTACHMENT_KINDS];
  return ["submission", "reference", "final"];
}

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const role = useRole();
  const { user } = useAuth();

  const { data: request, isLoading, error } = useQuery({
    queryKey: requestKeys.detail(id ?? ""),
    queryFn: () => getRequest(id!),
    enabled: !!id,
  });

  if (!id) return null;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading request…</p>;
  }

  if (error || !request) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Request not found or you don't have access.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/requests"><ArrowLeft className="mr-2 h-4 w-4" />Back to requests</Link>
        </Button>
      </div>
    );
  }

  const isOwner = !!user?.id && request.requester_id === user.id;
  const canUpload = canUploadFiles(role, request, user?.id ?? null);
  const tabs = tabsForRole(role, isOwner);
  const requesterAllowedKinds: AttachmentKind[] = ["submission", "reference"];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link to="/requests"><ArrowLeft className="mr-1 h-4 w-4" />Back</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{request.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {request.request_number && <span className="font-mono">{request.request_number}</span>}
            <Badge variant="outline">{request.status}</Badge>
            <Badge variant="outline">{request.priority}</Badge>
            <Badge variant="outline">{request.request_type}</Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{request.description}</p>
        </CardContent>
      </Card>

      <SharePointPanel
        requestId={request.id}
        folderUrl={request.sharepoint_folder_url ?? null}
      />

      <Tabs defaultValue={tabs[0]} className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          {tabs.map((k) => (
            <TabsTrigger key={k} value={k} className="capitalize">
              {k}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((k) => {
          const showUploader =
            canUpload &&
            (role === "admin" || role === "designer" || (isOwner && requesterAllowedKinds.includes(k)));
          return (
            <TabsContent key={k} value={k} className="space-y-4 pt-4">
              {showUploader && (
                <AttachmentUploader requestId={request.id} kind={k} />
              )}
              <AttachmentList requestId={request.id} kind={k} />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}