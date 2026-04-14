import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PreviewAuthProvider } from "@/contexts/PreviewAuthContext";
import { isPreviewEnvironment } from "@/lib/environment";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import PreviewLogin from "./pages/PreviewLogin";
import Dashboard from "./pages/Index";

const TasksPage = lazy(() => import("./pages/TasksPage"));
const ProjectListPage = lazy(() => import("./pages/ProjectListPage"));
const AIAssistantPage = lazy(() => import("./pages/AIAssistantPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const DiagnosticsPage = lazy(() => import("./pages/DiagnosticsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();
const IS_PREVIEW = isPreviewEnvironment();

/* ─── Protected route (works with both providers via shared AuthContext) ─── */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // In preview mode, check profile presence (no real session)
  if (IS_PREVIEW) {
    if (!profile) return <Navigate to="/login" replace />;
    return <AppLayout>{children}</AppLayout>;
  }

  // Production mode
  if (!session) return <Navigate to="/login" replace />;
  if (profile && !profile.is_active) {
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

  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, profile } = useAuth();

  if (!IS_PREVIEW) {
    if (loading) return null;
    if (session) return <Navigate to="/" replace />;
  } else {
    if (profile) return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

/* ─── Route definitions ─── */
function AppRoutes() {
  const LoginPage = IS_PREVIEW ? PreviewLogin : Login;

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          <Route path="/assigned-projects" element={<ProtectedRoute><ProjectListPage mode="assigned" /></ProtectedRoute>} />
          <Route path="/owned-projects" element={<ProtectedRoute><ProjectListPage mode="owned" /></ProtectedRoute>} />
          <Route path="/public-projects" element={<ProtectedRoute><ProjectListPage mode="public" /></ProtectedRoute>} />
          <Route path="/completed-projects" element={<ProtectedRoute><ProjectListPage mode="completed" /></ProtectedRoute>} />
          <Route path="/ai-assistant" element={<ProtectedRoute><AIAssistantPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/diagnostics" element={<ProtectedRoute><DiagnosticsPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

/* ─── App shell ─── */
const App = () => {
  const Provider = IS_PREVIEW ? PreviewAuthProvider : AuthProvider;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Provider>
            <AppRoutes />
          </Provider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
