import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface DashboardWidgetProps {
  title: string;
  icon: LucideIcon;
  children?: React.ReactNode;
  accentColor?: "default" | "accent" | "warning";
}

export function DashboardWidget({ title, icon: Icon, children, accentColor = "default" }: DashboardWidgetProps) {
  const accentClasses = {
    default: "border-l-primary/60",
    accent: "border-l-accent/70",
    warning: "border-l-warning/70",
  };

  return (
    <Card className={`border-l-[3px] ${accentClasses[accentColor]} shadow-sm`}>
      <div className="p-4 md:p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {children}
        </div>
      </div>
    </Card>
  );
}
