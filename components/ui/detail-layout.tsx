"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function DetailHeader({
  title,
  subtitle,
  meta,
  actions,
}: {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground mt-1">{subtitle}</p> : null}
          {meta ? <div className="flex flex-wrap gap-2 mt-3">{meta}</div> : null}
        </div>
        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export type TabDef = { id: string; label: string; count?: number; disabled?: boolean; hint?: string };

export function DetailTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="border-b" role="tablist" aria-label="Detail sections">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            aria-disabled={t.disabled}
            disabled={t.disabled}
            title={t.disabled ? t.hint : undefined}
            onClick={() => !t.disabled && onChange(t.id)}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium -mb-px transition-colors",
              active === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              t.disabled ? "opacity-50 cursor-not-allowed" : undefined,
            )}
          >
            {t.label}
            {typeof t.count === "number" ? <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">{t.count}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DetailPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("pt-4", className)}>{children}</div>;
}
