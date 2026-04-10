import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { brand } from "@/config/brand";
import { Shield } from "lucide-react";

const Login = () => {
  const { signInWithMicrosoft } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-4">
        <div className="bg-card rounded-xl border border-border shadow-lg p-8 space-y-8">
          {/* Logo area */}
          <div className="flex flex-col items-center space-y-3">
            <BrandLogo size="lg" />
            <div className="text-center space-y-1">
              <h1 className="text-xl font-semibold text-foreground tracking-tight">{brand.appName}</h1>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-[260px]">
                {brand.tagline}
              </p>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Sign in */}
          <div className="space-y-4">
            <Button
              onClick={signInWithMicrosoft}
              className="w-full h-11 gap-3"
              size="lg"
            >
              <Shield className="h-4 w-4" />
              Sign in with Microsoft
            </Button>
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Access is restricted to authorized Premier Brands employees via Microsoft Entra.
            </p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-6">
          &copy; {new Date().getFullYear()} {brand.companyName}
        </p>
      </div>
    </div>
  );
};

export default Login;
