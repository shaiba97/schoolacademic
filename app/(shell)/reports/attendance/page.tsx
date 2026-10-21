"use client";

import { ReportLayout } from "@/components/ui/report-layout";
import { DataTable, type Column } from "@/components/ui/data-table";

const rows = [{ date: "2025-09-22", present: 58, absent: 6 }, { date: "2025-09-21", present: 60, absent: 4 }];

export default function RAttendancePage() {
  return (
    <ReportLayout title="Attendance Reports" description="Read-only attendance aggregations." stats={[{ label: "Avg", value: "93%" }]} onExport={()=>alert("Export")}>
      <DataTable data={rows} columns={[
        { id: "date", header: "Date", accessor:(r)=>r.date, sortable:true},
        { id: "present", header:"Present", accessor:(r)=>r.present},
        { id: "absent", header:"Absent", accessor:(r)=>r.absent},
      ] as Column<typeof rows[number]>[]} getRowId={(r)=>r.date} />
    </ReportLayout>
  );
}
