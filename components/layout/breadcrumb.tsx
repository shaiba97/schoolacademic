"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { breadcrumbs } from "@/lib/nav";
import { useI18n } from "@/lib/i18n/locale-provider";

export function Breadcrumb() {
  const pathname = usePathname();
  const { t } = useI18n();
  const crumbs = breadcrumbs(pathname);
  if (crumbs.length === 0) return null; // detail routes render their own breadcrumb
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        const label = c.labelKey ? t(c.labelKey) : (c.fallbackLabel ?? "");
        return (
          <span key={`${c.href ?? c.fallbackLabel ?? c.labelKey}-${i}`} className="flex items-center gap-1.5">
            {i > 0 ? <ChevronRight size={14} className="text-muted-foreground shrink-0 rtl:rotate-180" aria-hidden /> : null}
            {c.href && !isLast ? (
              <Link href={c.href} className="text-muted-foreground hover:text-foreground transition-colors">
                {label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
