import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { brand } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4 px-4">
        <BrandLogo size="lg" />
        <h1 className="text-5xl font-bold text-foreground tracking-tight">404</h1>
        <p className="text-sm text-muted-foreground max-w-[260px] mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
        </Button>
        <p className="text-[11px] text-muted-foreground pt-4">
          {brand.appName} &middot; {brand.companyName}
        </p>
      </div>
    </div>
  );
};

export default NotFound;
