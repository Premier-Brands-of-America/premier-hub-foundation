import { useAuth } from "@/contexts/AuthContext";
import { MOCK_USERS } from "@/contexts/PreviewAuthContext";
import { BrandLogo } from "@/components/BrandLogo";
import { brand } from "@/config/brand";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Settings, Activity, ChevronRight } from "lucide-react";

const roleIcons = [User, Settings, Activity];

const PreviewLogin = () => {
  const { signInAsMock } = useAuth();

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden">
      {/* Ambient crimson glow — quiet brand atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/4 left-1/2 h-[60vh] w-[60vh] -translate-x-1/2 rounded-full bg-[hsl(var(--primary)/0.10)] blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {/* Branded crest header */}
          <div className="edge-rail border-b border-border px-8 pb-6 pt-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-muted/40">
                <BrandLogo size="lg" className="h-9 w-9" />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <h1 className="text-xl text-foreground">{brand.appName}</h1>
                <Badge
                  variant="outline"
                  className="border-[hsl(var(--primary)/0.30)] bg-[hsl(var(--primary)/0.10)] text-[10px] font-medium tracking-wide text-primary"
                >
                  Preview
                </Badge>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Select a test profile to enter the application
              </p>
            </div>
          </div>

          {/* Mock user cards */}
          <div className="space-y-2 px-5 py-5">
            {MOCK_USERS.map((mockUser, idx) => {
              const Icon = roleIcons[idx] ?? User;
              return (
                <button
                  key={mockUser.profile.id}
                  onClick={() => signInAsMock?.(mockUser.profile)}
                  className="group flex w-full items-center gap-3.5 rounded-lg border border-border bg-background p-3.5 text-left transition-colors duration-fast ease-standard hover:border-[hsl(var(--primary)/0.30)] hover:bg-accent"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary transition-colors duration-fast ease-standard group-hover:bg-[hsl(var(--primary)/0.12)]">
                    <Icon className="h-4 w-4 text-muted-foreground transition-colors duration-fast ease-standard group-hover:text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{mockUser.label}</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{mockUser.description}</p>
                  </div>
                  {mockUser.profile.is_admin && (
                    <Badge className="shrink-0 text-[10px]">Admin</Badge>
                  )}
                  {mockUser.profile.can_view_diagnostics && !mockUser.profile.is_admin && (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      Diagnostics
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/0 transition-colors duration-fast ease-standard group-hover:text-muted-foreground" />
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="border-t border-border px-8 py-3.5">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>Production uses Microsoft Entra sign-in</span>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Development Login &middot; &copy; {new Date().getFullYear()} {brand.companyName}
        </p>
      </div>
    </div>
  );
};

export default PreviewLogin;
