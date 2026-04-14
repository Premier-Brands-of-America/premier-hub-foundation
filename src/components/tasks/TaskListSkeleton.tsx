import { Skeleton } from "@/components/ui/skeleton";

export function TaskListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-1.5" role="status" aria-label="Loading tasks">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
          <Skeleton className="h-4 w-4 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      ))}
      <span className="sr-only">Loading tasks...</span>
    </div>
  );
}
