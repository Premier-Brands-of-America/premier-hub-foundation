import { cn } from "@/lib/utils";

type Role = "admin" | "designer" | "requester" | string | null | undefined;

const STYLES: Record<string, string> = {
  admin: "bg-destructive/15 text-destructive border-destructive/30",
  designer: "bg-primary/15 text-primary border-primary/30",
  requester: "bg-muted text-muted-foreground border-border",
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const key = (role ?? "requester").toString().toLowerCase();
  const style = STYLES[key] ?? STYLES.requester;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        style,
        className,
      )}
    >
      {key}
    </span>
  );
}