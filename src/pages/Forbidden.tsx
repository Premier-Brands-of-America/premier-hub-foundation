import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-3 max-w-md">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          You don't have permission to view that page.
        </p>
        <Button asChild><Link to="/">Back to dashboard</Link></Button>
      </div>
    </div>
  );
}
