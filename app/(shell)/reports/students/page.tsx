"use client";

import { ReportLayout, ReportBarChart } from "@/components/ui/report-layout";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SEED_STUDENTS } from "@/lib/mock/seed";

const rows = [
  { metric: "Active", count: SEED_STUDENTS.filter((s)=>s.status==="ACTIVE").length },
  { metric: "Pending admission", count: SEED_STUDENTS.filter((s)=>s.status==="PENDING_ADMISSION").length },
  { metric: "Graduated", count: SEED_STUDENTS.filter((s)=>s.status==="GRADUATED").length },
  { metric: "Transferred", count: SEED_STUDENTS.filter((s)=>s.status==="TRANSFERRED").length },
];

export default function StudentReportsPage() {
  return (
    <ReportLayout
      title="Student Reports"
      description="Read-only — no create/edit. Built from existing repositories with report-specific filters."
      stats={[{ label: "Total students", value: SEED_STUDENTS.length }, { label: "Active", value: rows[0].count }]}
      chart={<ReportBarChart data={rows.map((r)=>({ label: r.metric, value: r.count }))} />}
      onExport={() => alert("Export Excel/PDF — mock")}
    >
      <DataTable data={rows} columns={[
        { id: "metric", header: "Metric", accessor: (r)=>r.metric },
        { id: "count", header: "Count", accessor: (r)=>r.count, sortable: true },
      ] as Column<typeof rows[number]>[]} getRowId={(r)=>r.metric} />
    </ReportLayout>
  );
}
