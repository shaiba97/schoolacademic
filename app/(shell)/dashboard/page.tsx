"use client";

import { ReportLayout, StatCards, ReportBarChart } from "@/components/ui/report-layout";
import { DataTable } from "@/components/ui/data-table";
import { SEED_STUDENTS, SEED_EXAMS } from "@/lib/mock/seed";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage(){
  const rows = SEED_STUDENTS.slice(0,5).map((s)=>({ id: s.id, name: `${s.firstName} ${s.lastName}`, status: s.status }));
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="text-sm text-muted-foreground">Academic Affairs overview — read-only aggregations. No create/edit here (§5).</p>
      <StatCards stats={[
        { label: "Students", value: SEED_STUDENTS.length, hint: "Total seeded" },
        { label: "Active", value: SEED_STUDENTS.filter((s)=>s.status==="ACTIVE").length },
        { label: "Pending admissions", value: SEED_STUDENTS.filter((s)=>s.status==="PENDING_ADMISSION").length },
        { label: "Exams", value: SEED_EXAMS.length },
      ]} />
      <ReportBarChart data={[{label:"G9",value:5},{label:"G10",value:2},{label:"G11",value:3},{label:"G12",value:5}]} />
      <div className="rounded-xl border bg-card p-4">
        <h2 className="font-medium mb-3">Recent students</h2>
        <DataTable data={rows} columns={[
          { id:"name", header:"Name", accessor:(r: typeof rows[number])=>r.name},
          { id:"status", header:"Status", accessor:(r: typeof rows[number])=><Badge variant={r.status==="ACTIVE"?"success":"muted"}>{r.status}</Badge>},
        ] as never} getRowId={(r)=>r.id} />
      </div>
    </div>
  );
}
