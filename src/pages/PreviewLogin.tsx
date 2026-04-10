import { useAuth } from "@/contexts/AuthContext";
import { MOCK_USERS } from "@/contexts/PreviewAuthContext";
import { BrandLogo } from "@/components/BrandLogo";
import { brand } from "@/config/brand";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Settings, Activity } from "lucide-react";

const roleIcons = [User, Settings, Activity];

const PreviewLogin = () => {
  const { signInAsMock } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md mx-4">
        <div className="bg-card rounded-xl border border-border shadow-lg p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col items-center space-y-3">
            <BrandLogo size="lg" />
            <div className="text-center space-y-1.5">
              <h1 className="text-xl font-semibold text-foreground tracking-tight">{brand.appName}</h1>
              <Badge variant="outline" className="border-accent/40 text-accent font-medium text-[10px] tracking-wide">
                Preview Mode
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs text-center">
              Select a test profile to enter the application
            </p>
          </div>

          <div className="border-t border-border" />

          {/* Mock user cards */}
          <div className="space-y-2.5">
            {MOCK_USERS.map((mockUser, idx) => {
              const Icon = roleIcons[idx] ?? User;
              return (
                <button
                  key={mockUser.profile.id}
                  onClick={() => signInAsMock?.(mockUser.profile)}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-muted/50 transition-all text-left group"
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary group-hover:bg-primary/10 transition-colors shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{mockUser.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{mockUser.description}</p>
                  </div>
                  {mockUser.profile.is_admin && (
                    <Badge className="bg-accent/90 text-accent-foreground text-[10px] shrink-0">Admin</Badge>
                  )}
                  {mockUser.profile.can_view_diagnostics && !mockUser.profile.is_admin && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">Diagnostics</Badge>
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t border-border pt-3">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground justify-center">
              <Shield className="h-3 w-3" />
              <span>Production uses Microsoft Entra sign-in</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-6">
          Development Login &middot; &copy; {new Date().getFullYear()} {brand.companyName}
        </p>
      </div>
    </div>
  );
};

export default PreviewLogin;
