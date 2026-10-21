import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded bg-muted", className)} {...props} />;
}

export function DataTableSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3" aria-busy="true" aria-label="Loading">
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 max-w-md" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
