import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--destructive)/0.12)] text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl text-foreground">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don't have permission to view that page. If you think this is a
          mistake, contact your administrator.
        </p>
        <Button asChild className="mt-6 gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
