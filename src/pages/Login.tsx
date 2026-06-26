import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { brand } from "@/config/brand";
import { Shield, Lock } from "lucide-react";

const Login = () => {
  const { signInWithMicrosoft } = useAuth();

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden">
      {/* Ambient crimson glow — quiet brand atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/4 left-1/2 h-[60vh] w-[60vh] -translate-x-1/2 rounded-full bg-[hsl(var(--primary)/0.10)] blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {/* Branded crest header */}
          <div className="edge-rail border-b border-border px-8 pb-7 pt-9">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-muted/40">
                <BrandLogo size="lg" />
              </div>
              <h1 className="mt-5 text-2xl text-foreground">{brand.appName}</h1>
              <p className="mt-1.5 max-w-[260px] text-xs leading-relaxed text-muted-foreground">
                {brand.tagline}
              </p>
            </div>
          </div>

          {/* Sign in */}
          <div className="space-y-4 px-8 py-7">
            <Button
              onClick={signInWithMicrosoft}
              className="h-11 w-full gap-2.5"
              size="lg"
            >
              <Shield className="h-4 w-4" />
              Sign in with Microsoft
            </Button>
            <div className="flex items-start justify-center gap-1.5 text-center">
              <Lock className="mt-px h-3 w-3 shrink-0 text-muted-foreground" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Access is restricted to authorized Premier Brands employees via
                Microsoft Entra.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          &copy; {new Date().getFullYear()} {brand.companyName}
        </p>
      </div>
    </div>
  );
};

export default Login;
