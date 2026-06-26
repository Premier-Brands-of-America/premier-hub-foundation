import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { routeLabels } from "@/lib/routeLabels";

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const label = routeLabels[pathname];

  if (!label || pathname === "/") return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
      <Link to="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
        <Home className="h-3 w-3" />
        <span>Home</span>
      </Link>
      <ChevronRight className="h-3 w-3" />
      <span className="text-foreground font-medium">{label}</span>
    </nav>
  );
}
