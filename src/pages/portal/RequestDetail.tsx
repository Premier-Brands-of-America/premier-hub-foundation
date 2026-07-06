import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Hash, Loader2, Pencil, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useRequest, useDeleteRequest } from "@/hooks/useRequests";
import { AttachmentList } from "@/components/attachments/AttachmentList";
import { AttachmentUploader } from "@/components/attachments/AttachmentUploader";
import { SharePointPanel } from "@/components/request-detail/SharePointPanel";
import { EditRequestDialog } from "@/components/request-detail/EditRequestDialog";
import { toast } from "sonner";
import { RelationsSection } from "@/components/relations/RelationsSection";
import { BacklinksPanel } from "@/components/pages/BacklinksPanel";
import { DueDateBadge } from "@/components/common/DueDateBadge";
import { StatusBadge, PriorityBadge, TypeBadge } from "@/components/requests/requestBadges";
import { canUploadFiles } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ATTACHMENT_KINDS, type AttachmentKind } from "@/types/attachment";

function tabsForRole(
  role: ReturnType<typeof useRole>,
  isOwner: boolean,
): AttachmentKind[] {
  if (role === "admin" || role === "designer") return ["reference", "final"];
  // requester: see all but only upload to submission/reference (uploader gates this)
  if (isOwner) return ["reference", "final"];
  return ["reference", "final"];
}

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const role = useRole();
  const { user } = useAuth();

  const { data: request, isLoading, error } = useRequest(id);
  const navigate = useNavigate();
  const del = useDeleteRequest();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
  const requesterAllowedKinds: AttachmentKind[] = ["reference"];

  const typeLabel = request.request_type.replace(/_/g, " ");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-3 sm:p-4 md:p-6">
      <PageHeader title={request.title} subtitle={request.request_number ?? undefined} />
      <EditRequestDialog request={request} open={editOpen} onOpenChange={setEditOpen} />

      {/* Header band — the one bold element: title with crimson edge-rail. */}
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 gap-1.5 text-muted-foreground hover:text-foreground">
            <Link to="/requests">
              <ArrowLeft className="h-4 w-4" />
              Back to requests
            </Link>
          </Button>
          {(isOwner || role === "admin") && (
            <div className="flex items-center gap-2">
              {isOwner && (
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-destructive hover:text-destructive"
                disabled={del.isPending}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this request?</AlertDialogTitle>
                    <AlertDialogDescription>
                      "{request.title}" and its history will be removed. This can't be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        try {
                          await del.mutateAsync(request.id);
                          toast.success("Request deleted");
                          navigate("/requests");
                        } catch (e) {
                          toast.error((e as Error)?.message ?? "Could not delete request");
                        }
                      }}
                    >
                      Delete request
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
        <div className="edge-rail">
          <h1 className="text-2xl font-semibold tracking-tight">{request.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            {request.request_number && (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                <Hash className="h-3 w-3" />
                {request.request_number}
              </span>
            )}
            <StatusBadge status={request.status} />
            <PriorityBadge priority={request.priority} />
            <TypeBadge>{typeLabel}</TypeBadge>
            {request.due_date && request.status !== "complete" && request.status !== "archived" && (
              <DueDateBadge due={request.due_date} />
            )}
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

          {(() => {
            const meta = (request.metadata ?? {}) as Record<string, unknown>;
            const customer = typeof meta.customer === "string" ? meta.customer : null;
            const lead = typeof meta.project_lead === "string" ? meta.project_lead : null;
            const keyPoints = Array.isArray(meta.key_points)
              ? (meta.key_points as unknown[]).filter((p): p is string => typeof p === "string")
              : [];
            const meeting = meta.meeting_required === true;
            if (!customer && keyPoints.length === 0 && !meeting) return null;
            return (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Request summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {customer && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">{customer}</span>
                      {lead && (
                        <span className="text-muted-foreground">
                          → Lead: <span className="font-medium capitalize text-foreground">{lead}</span>
                        </span>
                      )}
                      {meeting && (
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          Meeting requested
                        </span>
                      )}
                    </div>
                  )}
                  {keyPoints.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Key points</p>
                      <ul className="list-disc space-y-1 pl-5">
                        {keyPoints.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          <details className="rounded-lg border border-border">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-muted-foreground">
              Connections &amp; backlinks
            </summary>
            <div className="space-y-4 border-t border-border p-4">
              <RelationsSection
                ownerRef={{ entityType: "request", entityId: request.id, title: request.title }}
                editable
              />
              <BacklinksPanel targetType="request" targetId={request.id} />
            </div>
          </details>

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
