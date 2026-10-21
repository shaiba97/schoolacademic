"use client";

import { ReportLayout, StatCards, ReportBarChart } from "@/components/ui/report-layout";
import { DataTable, type Column } from "@/components/ui/data-table";

const rows = [
  { section: "G9 A", present: 28, absent: 2, late: 1 },
  { section: "G9 B", present: 30, absent: 1, late: 0 },
  { section: "G10 A", present: 25, absent: 3, late: 2 },
];

export default function AttendanceReportsPage() {
  return (
    <ReportLayout
      title="Attendance Reports"
      description="Read-only aggregation over Sessions → Daily Attendance. No data entry here."
      stats={[{ label: "Avg attendance", value: "94.2%", hint: "Last 30 days" }, { label: "Sessions", value: 3 }, { label: "Students tracked", value: 42 }]}
      chart={<ReportBarChart data={rows.map((r) => ({ label: r.section, value: r.present }))} />}
      onExport={() => alert("Export PDF/Excel — mock")}
    >
      <DataTable data={rows} columns={[
        { id: "section", header: "Section", accessor: (r) => r.section },
        { id: "present", header: "Present", accessor: (r) => r.present, sortable: true },
        { id: "absent", header: "Absent", accessor: (r) => r.absent },
        { id: "late", header: "Late", accessor: (r) => r.late },
      ] as Column<typeof rows[number]>[]} getRowId={(r) => r.section} />
    </ReportLayout>
  );
}
