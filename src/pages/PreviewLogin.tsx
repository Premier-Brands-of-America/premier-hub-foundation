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
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="w-full max-w-lg mx-4">
        <div className="bg-card rounded-lg shadow-lg p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <BrandLogo size="lg" />
            <h1 className="text-2xl font-semibold text-foreground">{brand.appName}</h1>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="border-accent text-accent font-medium text-xs tracking-wide">
                Preview Mode
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Select a test profile to enter the application
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Mock user cards */}
          <div className="space-y-3">
            {MOCK_USERS.map((mockUser, idx) => {
              const Icon = roleIcons[idx] ?? User;
              return (
                <button
                  key={mockUser.profile.id}
                  onClick={() => signInAsMock?.(mockUser.profile)}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border border-border bg-background hover:border-accent hover:bg-accent/5 transition-all text-left group"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted group-hover:bg-accent/10 transition-colors shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{mockUser.label}</p>
                    <p className="text-xs text-muted-foreground">{mockUser.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {mockUser.profile.email}
                    </p>
                  </div>
                  {mockUser.profile.is_admin && (
                    <Badge className="bg-accent text-accent-foreground text-[10px] shrink-0">Admin</Badge>
                  )}
                  {mockUser.profile.can_view_diagnostics && !mockUser.profile.is_admin && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">Diagnostics</Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* Production note */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
              <Shield className="h-3.5 w-3.5" />
              <span>Production uses Microsoft Entra sign-in</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Development Login &middot; &copy; {new Date().getFullYear()} {brand.companyName}
        </p>
      </div>
    </div>
  );
};

export default PreviewLogin;
