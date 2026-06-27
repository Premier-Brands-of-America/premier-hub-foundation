import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, File, FileImage, FileSpreadsheet, FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  listProjectDocuments,
  uploadProjectDocument,
  removeProjectDocument,
  getProjectDocumentUrl,
  MAX_DOCUMENT_BYTES,
} from "@/services/projectDocuments";
import type { ProjectDocument } from "@/types/projects";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function DocIcon({ type }: { type: string }) {
  const cls = "h-4 w-4 shrink-0";
  if (type.startsWith("image/")) return <FileImage className={`${cls} text-[hsl(var(--entity-task))]`} />;
  if (type.includes("pdf")) return <FileText className={`${cls} text-[hsl(var(--destructive))]`} />;
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv"))
    return <FileSpreadsheet className={`${cls} text-[hsl(var(--success))]`} />;
  if (type.startsWith("text/") || type.includes("word") || type.includes("document"))
    return <FileText className={`${cls} text-[hsl(var(--entity-page))]`} />;
  return <File className={`${cls} text-muted-foreground`} />;
}

interface Props {
  projectId: string;
}

/**
 * Feature 3 — project Documents: upload, list (type icon + size + uploader +
 * date), preview/download, and remove. Works in preview via inline data-URLs
 * (Supabase Storage on deploy).
 */
export function ProjectDocuments({ projectId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const key = ["projectDocuments", projectId];

  const { data: docs = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: () => listProjectDocuments(projectId),
  });

  const upload = useMutation({
    mutationFn: (file: File) => uploadProjectDocument(projectId, user?.id ?? "preview-user", file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Document uploaded");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const remove = useMutation({
    mutationFn: (doc: ProjectDocument) => removeProjectDocument(doc),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Document removed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Remove failed"),
  });

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      if (f.size > MAX_DOCUMENT_BYTES) {
        toast.error(`${f.name} exceeds the 25MB limit.`);
        return;
      }
      upload.mutate(f);
    });
    if (inputRef.current) inputRef.current.value = "";
  };

  const openDoc = async (doc: ProjectDocument) => {
    const url = await getProjectDocumentUrl(doc);
    if (!url) {
      toast.error("Could not open this document.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Documents {docs.length > 0 && <span className="text-muted-foreground">({docs.length})</span>}
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
        >
          <Upload className="h-3.5 w-3.5" /> {upload.isPending ? "Uploading…" : "Upload"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {isLoading ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="rounded-md border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
          No documents yet. Upload PDFs, images, or Office files.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="group flex items-center gap-2.5 rounded-md border border-border px-2.5 py-2"
            >
              <DocIcon type={doc.file_type} />
              <button
                type="button"
                onClick={() => openDoc(doc)}
                className="min-w-0 flex-1 text-left"
                title="Open / download"
              >
                <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                  {doc.file_name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {formatBytes(doc.size_bytes)} · {doc.uploader_name || "Unknown"} ·{" "}
                  {format(new Date(doc.created_at), "MMM d, yyyy")}
                </p>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                aria-label={`Download ${doc.file_name}`}
                onClick={() => openDoc(doc)}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                aria-label={`Remove ${doc.file_name}`}
                onClick={() => remove.mutate(doc)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
