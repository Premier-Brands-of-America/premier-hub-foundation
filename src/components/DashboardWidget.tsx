import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardWidgetProps {
  title: string;
  icon: LucideIcon;
  children?: React.ReactNode;
  accentColor?: "default" | "accent" | "warning" | "info" | "success" | "danger";
  className?: string;
}

/** Crimson-edge rail color, keyed by semantic accent. `data-accent` also drives
 *  the central left-gradient wash in the component layer. */
const railColor: Record<string, string> = {
  accent: "before:bg-[hsl(var(--entity-project))]",
  warning: "before:bg-[hsl(var(--status-warning))]",
  info: "before:bg-[hsl(var(--primary))]",
  success: "before:bg-[hsl(var(--status-done))]",
  danger: "before:bg-[hsl(var(--destructive))]",
};

export function DashboardWidget({
  title,
  icon: Icon,
  children,
  accentColor = "default",
  className,
}: DashboardWidgetProps) {
  const hasRail = accentColor !== "default";
  return (
    <Card
      data-accent={hasRail ? accentColor : undefined}
      className={cn(
        "relative h-full overflow-hidden",
        hasRail && [
          "before:absolute before:left-0 before:top-0 before:bottom-0",
          "before:w-[2px] before:rounded-l-lg",
          railColor[accentColor],
        ],
        className,
      )}
    >
      <div className="p-4 md:p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted/60 text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        </div>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </Card>
  );
}
