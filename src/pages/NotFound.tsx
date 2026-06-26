import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { brand } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/4 left-1/2 h-[60vh] w-[60vh] -translate-x-1/2 rounded-full bg-[hsl(var(--primary)/0.08)] blur-3xl"
      />

      <div className="relative flex flex-col items-center text-center">
        <BrandLogo size="lg" className="h-8 w-8 opacity-80" />

        <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.10)] text-primary">
          <Compass className="h-6 w-6" />
        </div>

        <p className="stat-numeral mt-6 text-6xl leading-none text-foreground">404</p>
        <h1 className="mt-3 text-xl text-foreground">Page not found</h1>
        <p className="mt-2 max-w-[280px] text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <Button asChild className="mt-6 gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <p className="mt-10 text-[11px] text-muted-foreground">
          {brand.appName} &middot; {brand.companyName}
        </p>
      </div>
    </div>
  );
};

export default NotFound;
