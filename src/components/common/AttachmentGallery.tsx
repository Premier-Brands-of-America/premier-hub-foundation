/**
 * Attachment gallery — renders image attachments as a visible thumbnail grid
 * (click-to-view), and non-image files as a compact list. Shared across
 * Projects, Tasks, and Art Requests so requestor-uploaded images are visible.
 */
import { useState } from "react";
import { FileText, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface GalleryItem {
  id: string;
  name: string;
  mime: string;
  url: string;
}

function isImage(mime: string, name: string) {
  return mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
}

export function AttachmentGallery({
  items,
  className,
  emptyHint = "No attachments yet.",
}: {
  items: GalleryItem[];
  className?: string;
  emptyHint?: string;
}) {
  const [active, setActive] = useState<GalleryItem | null>(null);
  const images = items.filter((i) => isImage(i.mime, i.name));
  const files = items.filter((i) => !isImage(i.mime, i.name));

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyHint}</p>;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(img)}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <img
                src={img.url}
                alt={img.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-left text-[11px] text-white">
                {img.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li key={f.id}>
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{f.name}</span>
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="truncate text-base">{active?.name}</DialogTitle>
          {active && (
            <img
              src={active.url}
              alt={active.name}
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
