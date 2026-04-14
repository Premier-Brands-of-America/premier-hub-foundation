import { Skeleton } from "@/components/ui/skeleton";

export function ProjectListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1.5" role="status" aria-label="Loading projects">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading projects...</span>
    </div>
  );
}
