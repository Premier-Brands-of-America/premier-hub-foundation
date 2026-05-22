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

const railClass: Record<string, string> = {
  warning: "before:bg-[hsl(var(--status-warning))]",
  accent:  "before:bg-[hsl(var(--entity-project))]",
  success: "before:bg-[hsl(var(--status-done))]",
  info:    "before:bg-[hsl(var(--primary))]",
  danger:  "before:bg-[hsl(var(--destructive))]",
  default: "border-l-primary/60",
};

const classicBorder: Record<string, string> = {
  default: "border-l-primary/60",
  accent:  "border-l-accent/70",
  warning: "border-l-warning/70",
  info:    "border-l-primary/60",
  success: "border-l-success/70",
  danger:  "border-l-destructive/70",
};

export function DashboardWidget({
  title,
  icon: Icon,
  children,
  accentColor = "default",
  className,
}: DashboardWidgetProps) {
  const hasModernRail = accentColor !== "default";
  return (
    <Card
      data-accent={accentColor !== "default" ? accentColor : undefined}
      className={cn(
        "shadow-sm relative overflow-hidden h-full",
        // Classic left border
        "border-l-[3px]",
        classicBorder[accentColor],
        // Modern: hide classic border, use ::before rail
        "modern:border-l-0",
        hasModernRail && [
          "modern:before:absolute modern:before:left-0 modern:before:top-0 modern:before:bottom-0",
          "modern:before:w-[3px] modern:before:rounded-l-md",
          `modern:${railClass[accentColor]}`,
        ],
        className,
      )}
    >
      <div className="p-4 md:p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
        </div>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </Card>
  );
}
