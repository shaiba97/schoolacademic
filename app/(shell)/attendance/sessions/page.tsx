"use client";

import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { SEED_SESSIONS, SEED_SECTIONS, SEED_CLASSES } from "@/lib/mock/seed";
import * as React from "react";
import { Badge } from "@/components/ui/badge";

export default function SessionsPage() {
  const [sessions, setSessions] = React.useState(SEED_SESSIONS);
  const columns: Column<(typeof SEED_SESSIONS)[number]>[] = [
    { id: "section", header: "Section", accessor: (r) => {
        const s = SEED_SECTIONS.find((x) => x.id === r.sectionId);
        const c = SEED_CLASSES.find((y) => y.id === s?.classId);
        return `${c?.name ?? ""} ${s?.name ?? ""}`.trim();
      } },
    { id: "date", header: "Date", accessor: (r) => r.date, sortable: true },
    { id: "period", header: "Period", accessor: (r) => (r.period ? `P${r.period}` : "—") },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Sessions</h1>
      <p className="text-sm text-muted-foreground">Sessions created per class/section/date(/period). Daily Attendance entry is blocked without an open session (§3).</p>
      <DataTable
        data={sessions}
        columns={columns}
        getRowId={(r) => r.id}
        primaryAction={{ label: "New session", onClick: () => setSessions((p) => [...p, { id: `sess-${Date.now()}`, sectionId: "s-g9-a", date: new Date().toISOString().slice(0,10) }]) }}
      />
    </div>
  );
}
