import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useCanViewMemory } from "@/hooks/useCanViewMemory";
import { logMemoryView } from "@/services/memoryService";

/**
 * Gate for /memory: admin OR an active memory-access grant. On a granted view it
 * writes an append-only access-log row (log_memory_view). While the grant check
 * is in flight we render nothing to avoid a flash of the graph.
 */
export function MemoryRouteGuard({ children }: { children: React.ReactNode }) {
  const { canView, isLoading } = useCanViewMemory();

  useEffect(() => {
    if (canView) logMemoryView();
  }, [canView]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!canView) return <Navigate to="/" replace />;
  return <>{children}</>;
}
