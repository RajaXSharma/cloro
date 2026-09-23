import { Skeleton } from "@/components/ui/skeleton";

export function ProjectListSkeleton() {
  return (
    <div className="divide-y overflow-hidden rounded-lg border">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="mt-2 h-3 w-56" />
          </div>
        </div>
      ))}
    </div>
  );
}
