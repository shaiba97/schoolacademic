"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

export type Stat = { label: string; value: string | number; hint?: string; trend?: string };

export function StatCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">{s.value}</p>
            {s.hint ? <p className="text-xs text-muted-foreground mt-1">{s.hint}</p> : null}
            {s.trend ? <p className="text-xs text-success mt-1">{s.trend}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ReportBarChart({ data, max }: { data: { label: string; value: number }[]; max?: number }) {
  const m = max ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-medium mb-4">Distribution</h3>
      <div className="flex items-end gap-2 h-40">
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-2 min-w-0">
            <div className="w-full rounded-t bg-primary transition-all" style={{ height: `${(d.value / m) * 100}%`, minHeight: 4 }} aria-label={`${d.label} ${d.value}`} />
            <span className="text-xs text-muted-foreground truncate">{d.label}</span>
            <span className="text-xs font-medium">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportLayout({
  title,
  description,
  stats,
  chart,
  filters,
  onExport,
  children,
}: {
  title: string;
  description?: string;
  stats?: Stat[];
  chart?: React.ReactNode;
  filters?: React.ReactNode;
  onExport?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p> : null}
        </div>
        {onExport ? (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download size={16} /> Export
          </Button>
        ) : null}
      </div>
      {filters ? <div className="rounded-xl border bg-card p-3 flex flex-wrap gap-2">{filters}</div> : null}
      {stats ? <StatCards stats={stats} /> : null}
      {chart ? chart : null}
      <div>{children}</div>
      <p className="text-xs text-muted-foreground">Read-only — no create/edit affordances. Built from existing repositories with report-specific filters.</p>
    </div>
  );
}
