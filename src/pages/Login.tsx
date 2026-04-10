import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const Login = () => {
  const { signInWithMicrosoft } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="w-full max-w-md mx-4">
        <div className="bg-card rounded-lg shadow-lg p-8 space-y-8">
          {/* Logo area */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-sidebar">
              <span className="text-sidebar-foreground font-bold text-xl">P</span>
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Premier Project Hub</h1>
            <p className="text-muted-foreground text-sm">
              Internal project management for Premier Brands of America
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Sign in */}
          <div className="space-y-4">
            <Button
              onClick={signInWithMicrosoft}
              className="w-full h-12 gap-3 bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent"
              size="lg"
            >
              <Shield className="h-5 w-5" />
              Sign in with Microsoft
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Access is restricted to authorized Premier Brands employees via Microsoft Entra.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          &copy; {new Date().getFullYear()} Premier Brands of America. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
