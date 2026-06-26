import { Skeleton } from "@/components/ui/skeleton";

export function ProjectListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading projects">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5">
          <Skeleton className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Loading projects...</span>
    </div>
  );
}
