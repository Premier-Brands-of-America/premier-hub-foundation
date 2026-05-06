import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Trash2, FileText, FileImage, File as FileIcon, FileArchive, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import {
  ATTACHMENT_KINDS,
  formatBytes,
  type AttachmentKind,
  type RequestAttachment,
} from "@/types/attachment";
import { createSignedUrl, deleteAttachment, listAttachments } from "@/services/attachments";

function iconFor(name: string, mime: string) {
  const cls = "h-5 w-5 text-muted-foreground";
  if (mime.startsWith("image/")) return <FileImage className={cls} />;
  if (mime.startsWith("video/")) return <FileVideo className={cls} />;
  if (/\.(zip|rar|7z)$/i.test(name)) return <FileArchive className={cls} />;
  if (/\.(pdf|doc|docx|txt|rtf)$/i.test(name)) return <FileText className={cls} />;
  return <FileIcon className={cls} />;
}

function Thumb({ att }: { att: RequestAttachment }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!att.mime_type.startsWith("image/")) return;
    createSignedUrl(att.storage_path, 300)
      .then((u) => active && setUrl(u))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [att.storage_path, att.mime_type]);
  if (!att.mime_type.startsWith("image/")) return null;
  if (!url) return <div className="h-12 w-12 rounded bg-muted" aria-hidden />;
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      className="h-12 w-12 rounded object-cover"
    />
  );
}

interface AttachmentRowProps {
  att: RequestAttachment;
  canDelete: boolean;
  onDeleted: () => void;
}

function AttachmentRow({ att, canDelete, onDeleted }: AttachmentRowProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    try {
      const url = await createSignedUrl(att.storage_path, 60);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast({
        title: "Download failed",
        description: e instanceof Error ? e.message : "Could not generate link",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${att.file_name}?`)) return;
    setBusy(true);
    try {
      await deleteAttachment(att);
      onDeleted();
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Could not delete file",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex items-center gap-3 rounded-md border p-2">
      {att.mime_type.startsWith("image/") ? <Thumb att={att} /> : iconFor(att.file_name, att.mime_type)}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{att.file_name}</p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(att.size_bytes)} • {att.uploader?.full_name ?? att.uploader?.email ?? "Unknown"} •{" "}
          {new Date(att.created_at).toLocaleString()}
        </p>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={handleDownload} aria-label={`Download ${att.file_name}`}>
        <Download className="h-4 w-4" />
      </Button>
      {canDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={busy}
          onClick={handleDelete}
          aria-label={`Delete ${att.file_name}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </li>
  );
}

interface AttachmentListProps {
  requestId: string;
  kind?: AttachmentKind | "all";
}

export function AttachmentList({ requestId, kind = "all" }: AttachmentListProps) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const role = useRole();
  const isAdmin = role === "admin";
  const myProfileId = profile?.id;

  const { data = [], isLoading } = useQuery({
    queryKey: ["request-attachments", requestId, kind],
    queryFn: () => listAttachments(requestId, kind === "all" ? undefined : kind),
  });

  const canDelete = (att: RequestAttachment): boolean => {
    if (isAdmin) return true;
    if (att.uploaded_by !== myProfileId) return false;
    return Date.now() - new Date(att.created_at).getTime() < 5 * 60 * 1000;
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading attachments…</p>;
  }

  if (!data.length) {
    return <p className="text-sm text-muted-foreground">No attachments yet.</p>;
  }

  if (kind !== "all") {
    return (
      <ul className="space-y-2">
        {data.map((a) => (
          <AttachmentRow
            key={a.id}
            att={a}
            canDelete={canDelete(a)}
            onDeleted={() => qc.invalidateQueries({ queryKey: ["request-attachments", requestId] })}
          />
        ))}
      </ul>
    );
  }

  // Group by kind
  const groups = ATTACHMENT_KINDS.map((k) => ({
    kind: k,
    items: data.filter((a) => a.kind === k),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.kind} className="space-y-2">
          <h4 className="text-sm font-semibold capitalize">{g.kind}</h4>
          <ul className="space-y-2">
            {g.items.map((a) => (
              <AttachmentRow
                key={a.id}
                att={a}
                canDelete={canDelete(a)}
                onDeleted={() => qc.invalidateQueries({ queryKey: ["request-attachments", requestId] })}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}