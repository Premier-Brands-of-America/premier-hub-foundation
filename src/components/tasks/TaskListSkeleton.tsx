import { Skeleton } from "@/components/ui/skeleton";

export function TaskListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading tasks">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5"
        >
          <Skeleton className="h-4 w-4 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      ))}
      <span className="sr-only">Loading tasks…</span>
    </div>
  );
}
