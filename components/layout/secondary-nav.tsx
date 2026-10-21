"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { findSectionByHref } from "@/lib/nav";

export function SecondaryNav() {
  const pathname = usePathname();
  const section = findSectionByHref(pathname);
  if (!section || section.children.length === 0) return null;

  // Filter duplicates: Examinations has duplicate href for "Exam Subjects" — dedupe by href, keep first, but label correctly
  const seen = new Set<string>();
  const children = section.children.filter((c) => {
    if (seen.has(c.href)) return false;
    seen.add(c.href);
    return true;
  });

  // Determine active child by longest href match
  const activeHref = (() => {
    const sorted = [...children].sort((a, b) => b.href.length - a.href.length);
    return sorted.find((c) => pathname === c.href || pathname.startsWith(c.href + "/"))?.href ?? children[0]?.href;
  })();

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <div
        className="flex gap-1.5 overflow-x-auto overflow-y-hidden p-1"
        role="tablist"
        aria-label={`${section.label} sections`}
      >
        {children.map((child) => {
          const active = child.href === activeHref;
          return (
            <Link
              key={child.href}
              href={child.href}
              role="tab"
              aria-selected={active}
              title={child.description}
              className={cn(
                "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors border",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {child.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
