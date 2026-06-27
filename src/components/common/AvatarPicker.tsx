/**
 * AvatarPicker — choose an avatar (people) or icon (projects/tasks).
 * Ported from the owner's NexoString AvatarPicker: a grid of deterministic
 * DiceBear presets plus, for people, an "Upload image" path that resizes the
 * file to a square data-URL locally (no server round-trip required for the
 * preview; production wiring to Supabase Storage is logged in BLOCKERS.md).
 */
import { useMemo, useRef, useState } from "react";
import { Upload, Check } from "lucide-react";
import type { NodeType } from "@/types/graph";
import { dicebearDataUri, type AvatarStyleKey } from "@/lib/avatars/dicebear";
import { HUE_VAR_BY_TYPE } from "@/lib/avatars/entityAvatars";
import { cn } from "@/lib/utils";

/** Resize an uploaded image to a square thumbnail data-URL (stays client-side). */
function fileToSquareDataUrl(file: File, size = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ICON_STYLES: Record<Exclude<NodeType, "user">, AvatarStyleKey> = {
  project: "shapes",
  task: "icons",
  request: "icons",
  department: "shapes",
  page: "glass",
};

export function AvatarPicker({
  type,
  value,
  onChange,
}: {
  type: NodeType;
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const hueVar = HUE_VAR_BY_TYPE[type];
  const isPerson = type === "user";

  const presets = useMemo(() => {
    if (isPerson) {
      const people = Array.from({ length: 12 }, (_, i) => {
        const seed = `premier-person-${i + 1}`;
        return { seed, uri: dicebearDataUri(seed, { style: "person" }) };
      });
      const bots = Array.from({ length: 4 }, (_, i) => {
        const seed = `premier-bot-${i + 1}`;
        return { seed, uri: dicebearDataUri(seed, { style: "bot" }) };
      });
      return [...people, ...bots];
    }
    const style = ICON_STYLES[type as Exclude<NodeType, "user">] ?? "shapes";
    return Array.from({ length: 16 }, (_, i) => {
      const seed = `premier-${type}-${i + 1}`;
      return { seed, uri: dicebearDataUri(seed, { style }) };
    });
  }, [type, isPerson]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await fileToSquareDataUrl(file);
      onChange(url);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {isPerson ? "Avatar" : "Icon"}
        </span>
        {isPerson && (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Uploading…" : "Upload image"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          </>
        )}
      </div>
      <div className="grid grid-cols-8 gap-2">
        {presets.map((p) => {
          const active = value === p.uri;
          return (
            <button
              key={p.seed}
              type="button"
              onClick={() => onChange(p.uri)}
              style={{ ["--neuron-color" as string]: `var(${hueVar})` }}
              className={cn(
                "relative aspect-square overflow-hidden rounded-md border transition-all duration-base hover:-translate-y-0.5",
                active
                  ? "border-[hsl(var(--neuron-color))] ring-2 ring-[hsl(var(--neuron-color)/0.5)]"
                  : "border-border",
              )}
            >
              <img src={p.uri} alt="" className="h-full w-full object-cover" />
              {active && (
                <span className="absolute inset-0 grid place-items-center bg-background/40">
                  <Check className="h-4 w-4 text-foreground" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
