import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function FeatureOff() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-3 max-w-md">
        <h1 className="text-2xl font-semibold">Feature unavailable</h1>
        <p className="text-sm text-muted-foreground">
          This feature is disabled for your account.
        </p>
        <Button asChild><Link to="/">Back to dashboard</Link></Button>
      </div>
    </div>
  );
}
