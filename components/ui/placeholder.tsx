import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Placeholder({
  icon: Icon,
  title,
  description,
  meta,
  actions,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  meta?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-6", className)}>
      <div className="flex items-start gap-4">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-none tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{description}</p>
          {meta ? <p className="mt-3 text-xs font-medium text-muted-foreground border-t pt-3">{meta}</p> : null}
          {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
      <div className="mt-6 rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
        Route placeholder — real data table / wizard / detail will replace this in the next slice. The route is deep-linkable and the two-level nav is verified.
      </div>
    </div>
  );
}
