import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function SectionSkeleton({
  icon,
  title,
  stage,
  description,
  coming,
}: {
  icon: LucideIcon;
  title: string;
  stage: string;
  description: string;
  coming: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stage}</p>
        <h1 className="text-xl font-semibold tracking-tight mt-1">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <EmptyState icon={icon} title="Under construction" description={coming} />
    </div>
  );
}
