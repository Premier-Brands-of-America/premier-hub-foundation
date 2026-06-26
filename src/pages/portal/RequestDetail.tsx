import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Hash, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { getRequest } from "@/services/requests";
import { requestKeys } from "@/hooks/useRequests";
import { AttachmentList } from "@/components/attachments/AttachmentList";
import { AttachmentUploader } from "@/components/attachments/AttachmentUploader";
import { SharePointPanel } from "@/components/request-detail/SharePointPanel";
import { RelationsSection } from "@/components/relations/RelationsSection";
import { BacklinksPanel } from "@/components/pages/BacklinksPanel";
import { canUploadFiles } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ATTACHMENT_KINDS, type AttachmentKind } from "@/types/attachment";
import type { RequestPriority, RequestStatus } from "@/types/request";

function tabsForRole(
  role: ReturnType<typeof useRole>,
  isOwner: boolean,
): AttachmentKind[] {
  if (role === "admin" || role === "designer") return [...ATTACHMENT_KINDS];
  // requester: see all but only upload to submission/reference (uploader gates this)
  if (isOwner) return [...ATTACHMENT_KINDS];
  return ["submission", "reference", "final"];
}

// Presentation-only token mapping: status / priority → semantic color token.
const STATUS_TOKEN: Record<RequestStatus, string> = {
  submitted: "--status-info",
  in_review: "--status-info",
  assigned: "--entity-task",
  in_progress: "--status-warning",
  waiting_on_info: "--status-warning",
  internal_review: "--entity-request",
  sent_for_approval: "--entity-request",
  complete: "--status-done",
  archived: "--muted-foreground",
};

const PRIORITY_TOKEN: Record<RequestPriority, string> = {
  low: "--priority-low",
  medium: "--priority-medium",
  high: "--priority-high",
  urgent: "--priority-urgent",
};

function TokenBadge({ token, children }: { token: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium capitalize"
      style={{
        backgroundColor: `hsl(var(${token}) / 0.14)`,
        color: `hsl(var(${token}))`,
      }}
    >
      {children}
    </span>
  );
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
    return (
      <div className="mx-auto max-w-5xl p-3 sm:p-4 md:p-6">
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading request…
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="mx-auto max-w-5xl p-3 sm:p-4 md:p-6">
        <Card>
          <CardContent className="py-12">
            <div className="empty-state">
              <h3 className="text-base font-semibold text-foreground">Request not found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                It may have been removed or you don't have access to it.
              </p>
              <div className="mt-4 flex justify-center">
                <Button asChild variant="outline" size="sm">
                  <Link to="/requests">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to requests
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwner = !!user?.id && request.requester_id === user.id;
  const canUpload = canUploadFiles(role, request, user?.id ?? null);
  const tabs = tabsForRole(role, isOwner);
  const requesterAllowedKinds: AttachmentKind[] = ["submission", "reference"];

  const statusLabel = request.status.replace(/_/g, " ");
  const typeLabel = request.request_type.replace(/_/g, " ");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-3 sm:p-4 md:p-6">
      <PageHeader title={request.title} subtitle={request.request_number ?? undefined} />

      {/* Header band — the one bold element: title with crimson edge-rail. */}
      <header className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 gap-1.5 text-muted-foreground hover:text-foreground">
          <Link to="/requests">
            <ArrowLeft className="h-4 w-4" />
            Back to requests
          </Link>
        </Button>
        <div className="edge-rail">
          <h1 className="text-2xl font-semibold tracking-tight">{request.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            {request.request_number && (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                <Hash className="h-3 w-3" />
                {request.request_number}
              </span>
            )}
            <TokenBadge token={STATUS_TOKEN[request.status]}>{statusLabel}</TokenBadge>
            <TokenBadge token={PRIORITY_TOKEN[request.priority]}>{request.priority}</TokenBadge>
            <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
              {typeLabel}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {request.description}
              </p>
            </CardContent>
          </Card>

          <RelationsSection
            ownerRef={{ entityType: "request", entityId: request.id, title: request.title }}
            editable
          />

          <BacklinksPanel targetType="request" targetId={request.id} />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Files</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={tabs[0]} className="w-full">
                <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-muted/50">
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
            </CardContent>
          </Card>
        </div>

        {/* Meta sidebar */}
        <aside className={cn("space-y-6", "lg:sticky lg:top-20 lg:self-start")}>
          <SharePointPanel
            requestId={request.id}
            folderUrl={request.sharepoint_folder_url ?? null}
          />
        </aside>
      </div>
    </div>
  );
}
