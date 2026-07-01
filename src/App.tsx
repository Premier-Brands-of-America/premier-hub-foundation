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
import { RouteAnnouncer } from "@/components/RouteAnnouncer";
import { FeatureFlagsProvider } from "@/providers/FeatureFlagsProvider";
import { DesignModeProvider } from "@/providers/DesignModeProvider";
import { FeatureRoute } from "@/components/FeatureRoute";
import { MemoryRouteGuard } from "@/components/memory/MemoryRouteGuard";
import Login from "./pages/Login";
import PreviewLogin from "./pages/PreviewLogin";
import Dashboard from "./pages/Index";
import AuthCallback from "./pages/AuthCallback";
import { toast } from "@/hooks/use-toast";

const TasksPage = lazy(() => import("./pages/TasksPage"));
const ProjectListPage = lazy(() => import("./pages/ProjectListPage"));
const ProjectsHub = lazy(() => import("./pages/ProjectsHub"));
const AIAssistantPage = lazy(() => import("./pages/AIAssistantPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const DiagnosticsPage = lazy(() => import("./pages/DiagnosticsPage"));
const DebugFlags = lazy(() => import("./pages/admin/DebugFlags"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SubmitRequest = lazy(() => import("./pages/portal/SubmitRequest"));
const EasyRequest = lazy(() => import("./pages/portal/EasyRequest"));
const FullBriefRequest = lazy(() => import("./pages/portal/FullBriefRequest"));
const MyRequests = lazy(() => import("./pages/portal/MyRequests"));
const RequestDetail = lazy(() => import("./pages/portal/RequestDetail"));
const Queue = lazy(() => import("./pages/portal/Queue"));
const Workload = lazy(() => import("./pages/portal/Workload"));
const ReportsPage = lazy(() => import("./pages/portal/Reports"));
const AuditLogPage = lazy(() => import("./pages/portal/AuditLogPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const Forbidden = lazy(() => import("./pages/Forbidden"));
const FeatureOff = lazy(() => import("./pages/FeatureOff"));
const PagesPage = lazy(() => import("./pages/Pages"));
const TimelinePage = lazy(() => import("./pages/Timeline"));
const GraphPage = lazy(() => import("./pages/Graph"));
const PlannerPage = lazy(() => import("./pages/Planner"));
const SearchResultsPage = lazy(() => import("./pages/SearchResults"));
const ProjectDetailRoute = lazy(() => import("./pages/ProjectDetailRoute"));
const TaskDetailRoute = lazy(() => import("./pages/TaskDetailRoute"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
const IS_PREVIEW = isPreviewEnvironment();

/* ─── Protected route (works with both providers via shared AuthContext) ─── */
function ProtectedRoute({
  children,
  requireRole,
  allowDiagnostics,
}: {
  children: React.ReactNode;
  requireRole?: "admin" | "designer" | "requester" | Array<"admin" | "designer" | "requester">;
  /** When set, a user with `can_view_diagnostics` passes even if their role
   *  isn't in `requireRole` (used by the Audit Log: admin + diagnostics). */
  allowDiagnostics?: boolean;
}) {
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
  } else {
    if (!session) return <Navigate to="/login" replace />;
  }

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

  if (requireRole) {
    const allowed = Array.isArray(requireRole) ? requireRole : [requireRole];
    const effectiveRole = profile?.role ?? (profile?.is_admin ? "admin" : undefined);
    const roleOk = effectiveRole && allowed.includes(effectiveRole as "admin" | "designer" | "requester");
    const ok = roleOk || (allowDiagnostics && !!profile?.can_view_diagnostics);
    if (!ok) {
      toast({ title: "Access denied", description: "You don't have permission to view that page.", variant: "destructive" });
      return <Navigate to="/" replace />;
    }
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
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetailRoute /></ProtectedRoute>} />
          <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetailRoute /></ProtectedRoute>} />
          <Route path="/planner" element={<ProtectedRoute><PlannerPage /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><ProjectsHub /></ProtectedRoute>} />
          <Route path="/assigned-projects" element={<ProtectedRoute><ProjectListPage mode="assigned" /></ProtectedRoute>} />
          <Route path="/owned-projects" element={<ProtectedRoute><ProjectListPage mode="owned" /></ProtectedRoute>} />
          <Route path="/public-projects" element={<ProtectedRoute><ProjectListPage mode="public" /></ProtectedRoute>} />
          <Route path="/completed-projects" element={<ProtectedRoute><ProjectListPage mode="completed" /></ProtectedRoute>} />
          <Route path="/ai-assistant" element={<ProtectedRoute><AIAssistantPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute requireRole="admin"><FeatureRoute feature="admin_settings"><AdminSettings /></FeatureRoute></ProtectedRoute>} />
          <Route path="/diagnostics" element={<ProtectedRoute><DiagnosticsPage /></ProtectedRoute>} />
          <Route path="/debug/flags" element={<ProtectedRoute requireRole="admin"><DebugFlags /></ProtectedRoute>} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/requests/new" element={<ProtectedRoute requireRole={["requester","designer","admin"]}><FeatureRoute feature="art_request_portal"><SubmitRequest /></FeatureRoute></ProtectedRoute>} />
          <Route path="/requests/new/easy" element={<ProtectedRoute requireRole={["requester","designer","admin"]}><FeatureRoute feature="art_request_portal"><EasyRequest /></FeatureRoute></ProtectedRoute>} />
          <Route path="/requests/new/full-brief" element={<ProtectedRoute requireRole={["requester","designer","admin"]}><FeatureRoute feature="art_request_portal"><FullBriefRequest /></FeatureRoute></ProtectedRoute>} />
          <Route path="/requests/:id" element={<ProtectedRoute><FeatureRoute feature="art_request_portal"><RequestDetail /></FeatureRoute></ProtectedRoute>} />
          <Route path="/requests" element={<ProtectedRoute><FeatureRoute feature="art_request_portal"><MyRequests /></FeatureRoute></ProtectedRoute>} />
          <Route path="/queue" element={<ProtectedRoute requireRole={["designer","admin"]}><FeatureRoute feature="art_request_portal"><Queue /></FeatureRoute></ProtectedRoute>} />
          <Route path="/workload" element={<ProtectedRoute requireRole="admin"><FeatureRoute feature="department_dashboard"><Workload /></FeatureRoute></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute requireRole="admin"><FeatureRoute feature="reports"><ReportsPage /></FeatureRoute></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute requireRole="admin" allowDiagnostics><FeatureRoute feature="audit_trail"><AuditLogPage /></FeatureRoute></ProtectedRoute>} />
          <Route path="/pages" element={<ProtectedRoute><FeatureRoute feature="pages"><PagesPage /></FeatureRoute></ProtectedRoute>} />
          <Route path="/pages/:id" element={<ProtectedRoute><FeatureRoute feature="pages"><PagesPage /></FeatureRoute></ProtectedRoute>} />
          <Route path="/timeline" element={<ProtectedRoute><FeatureRoute feature="timeline"><TimelinePage /></FeatureRoute></ProtectedRoute>} />
          <Route path="/graph" element={<ProtectedRoute requireRole={["admin","designer"]}><FeatureRoute feature="graph"><GraphPage key="graph" /></FeatureRoute></ProtectedRoute>} />
          <Route path="/org" element={<ProtectedRoute><GraphPage key="org" initialMode="org" /></ProtectedRoute>} />
          <Route path="/memory" element={<ProtectedRoute><MemoryRouteGuard><GraphPage key="memory" initialMode="memory" /></MemoryRouteGuard></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><SearchResultsPage /></ProtectedRoute>} />
          <Route path="/403" element={<ProtectedRoute><Forbidden /></ProtectedRoute>} />
          <Route path="/feature-off" element={<ProtectedRoute><FeatureOff /></ProtectedRoute>} />
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
      <DesignModeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Provider>
              <FeatureFlagsProvider>
                <RouteAnnouncer />
                <AppRoutes />
              </FeatureFlagsProvider>
            </Provider>
          </BrowserRouter>
        </TooltipProvider>
      </DesignModeProvider>
    </QueryClientProvider>
  );
};

export default App;
