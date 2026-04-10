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
    default: "border-l-primary",
    accent: "border-l-accent",
    warning: "border-l-warning",
  };

  return (
    <Card className={`border-l-4 ${accentClasses[accentColor]} overflow-hidden`}>
      <div className="p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {children}
        </div>
      </div>
    </Card>
  );
}
