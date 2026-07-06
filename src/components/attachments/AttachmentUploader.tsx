import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FeatureGate } from "@/components/FeatureGate";
import { isPreviewEnvironment } from "@/lib/environment";
import { useToast } from "@/hooks/use-toast";
import {
  ALLOWED_MIME_EXT,
  MAX_FILE_BYTES,
  formatBytes,
  isExtAllowed,
  slugifyFilename,
  type AttachmentKind,
} from "@/types/attachment";
import { uploadAttachment } from "@/services/attachments";
import { cn } from "@/lib/utils";

const IS_PREVIEW = isPreviewEnvironment();

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "success" | "error";
  error?: string;
}

interface AttachmentUploaderProps {
  requestId: string;
  kind: AttachmentKind;
  className?: string;
}

function AttachmentUploaderInner({ requestId, kind, className }: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const startUpload = useCallback(
    async (item: UploadItem) => {
      setItems((s) => s.map((i) => (i.id === item.id ? { ...i, status: "uploading", progress: 10 } : i)));
      const ts = Date.now();
      const storagePath = `requests/${requestId}/${kind}/${ts}-${slugifyFilename(item.file.name)}`;
      const attempt = async (tries = 0): Promise<void> => {
        try {
          await uploadAttachment({ requestId, kind, file: item.file, storagePath });
          setItems((s) => s.map((i) => (i.id === item.id ? { ...i, status: "success", progress: 100 } : i)));
          qc.invalidateQueries({ queryKey: ["request-attachments", requestId] });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Upload failed";
          if (tries < 1) {
            setItems((s) => s.map((i) => (i.id === item.id ? { ...i, progress: 30 } : i)));
            await new Promise((r) => setTimeout(r, 800));
            return attempt(tries + 1);
          }
          setItems((s) => s.map((i) => (i.id === item.id ? { ...i, status: "error", error: msg } : i)));
          toast({ title: "Upload failed", description: msg, variant: "destructive" });
        }
      };
      await attempt();
    },
    [requestId, kind, qc, toast],
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const queued: UploadItem[] = [];
      Array.from(files).forEach((file) => {
        if (!isExtAllowed(file.name)) {
          toast({
            title: "Unsupported file type",
            description: `${file.name} is not an allowed format.`,
            variant: "destructive",
          });
          return;
        }
        if (file.size > MAX_FILE_BYTES) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds 100MB.`,
            variant: "destructive",
          });
          return;
        }
        queued.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          file,
          progress: 0,
          status: "queued",
        });
      });
      if (!queued.length) return;
      setItems((s) => [...s, ...queued]);
      queued.forEach((q) => void startUpload(q));
    },
    [startUpload, toast],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/60",
        )}
      >
        <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">Drop files or click to upload</p>
        <p className="text-xs text-muted-foreground">
          Up to 100MB each • {ALLOWED_MIME_EXT.join(", ")}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="rounded-md border p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(it.file.size)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {it.status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
                  {it.status !== "uploading" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setItems((s) => s.filter((i) => i.id !== it.id))}
                      aria-label={`Remove ${it.file.name}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {(it.status === "uploading" || it.status === "queued") && (
                <Progress value={it.progress} className="mt-2 h-1.5" />
              )}
              {it.status === "error" && (
                <p className="mt-1 text-xs text-destructive">{it.error}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AttachmentUploader(props: AttachmentUploaderProps) {
  // Preview has no demo storage backend — an upload here would write to the
  // real Supabase bucket, so don't mount the dropzone at all.
  if (IS_PREVIEW) {
    return (
      <p className={cn("text-xs text-muted-foreground", props.className)}>
        Uploads are disabled in preview.
      </p>
    );
  }
  return (
    <FeatureGate feature="file_uploads">
      <AttachmentUploaderInner {...props} />
    </FeatureGate>
  );
}