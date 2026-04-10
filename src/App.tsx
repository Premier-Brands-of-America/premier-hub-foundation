import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PreviewAuthProvider, usePreviewAuth } from "@/contexts/PreviewAuthContext";
import { isPreviewEnvironment } from "@/lib/environment";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import PreviewLogin from "./pages/PreviewLogin";
import Dashboard from "./pages/Index";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const IS_PREVIEW = isPreviewEnvironment();

/* ─── Production protected route ─── */
function ProdProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, profile } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;

  if (profile && !profile.is_active) return <AccessRevokedScreen />;

  return <AppLayout>{children}</AppLayout>;
}

function ProdPublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/* ─── Preview protected route ─── */
function PreviewProtectedRoute({ children }: { children: React.ReactNode }) {
  const { profile } = usePreviewAuth();
  if (!profile) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function PreviewPublicRoute({ children }: { children: React.ReactNode }) {
  const { profile } = usePreviewAuth();
  if (profile) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/* ─── Shared UI ─── */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function AccessRevokedScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="text-center space-y-2 max-w-md mx-4">
        <h1 className="text-xl font-semibold text-foreground">Access Revoked</h1>
        <p className="text-sm text-muted-foreground">
          Your access to Premier Project Hub has been removed. Contact your administrator if you believe this is an error.
        </p>
      </div>
    </div>
  );
}

/* ─── Route definitions (shared) ─── */
function AppRoutes({ ProtectedRoute, PublicRoute, LoginPage }: {
  ProtectedRoute: React.ComponentType<{ children: React.ReactNode }>;
  PublicRoute: React.ComponentType<{ children: React.ReactNode }>;
  LoginPage: React.ComponentType;
}) {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><PlaceholderPage /></ProtectedRoute>} />
      <Route path="/assigned-projects" element={<ProtectedRoute><PlaceholderPage /></ProtectedRoute>} />
      <Route path="/owned-projects" element={<ProtectedRoute><PlaceholderPage /></ProtectedRoute>} />
      <Route path="/public-projects" element={<ProtectedRoute><PlaceholderPage /></ProtectedRoute>} />
      <Route path="/completed-projects" element={<ProtectedRoute><PlaceholderPage /></ProtectedRoute>} />
      <Route path="/ai-assistant" element={<ProtectedRoute><PlaceholderPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><PlaceholderPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

/* ─── App shell ─── */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {IS_PREVIEW ? (
          <PreviewAuthProvider>
            <AppRoutes
              ProtectedRoute={PreviewProtectedRoute}
              PublicRoute={PreviewPublicRoute}
              LoginPage={PreviewLogin}
            />
          </PreviewAuthProvider>
        ) : (
          <AuthProvider>
            <AppRoutes
              ProtectedRoute={ProdProtectedRoute}
              PublicRoute={ProdPublicRoute}
              LoginPage={Login}
            />
          </AuthProvider>
        )}
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
