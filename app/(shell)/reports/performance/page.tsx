"use client";

import { ReportLayout, ReportBarChart } from "@/components/ui/report-layout";
import { DataTable } from "@/components/ui/data-table";
import { SEED_RESULTS } from "@/lib/mock/seed";

const gradeCounts = ["A","B","C","D","F"].map((g)=>({ label: g, value: SEED_RESULTS.filter((r)=>r.grade===g).length }));
export default function RPerformancePage(){
  return (
    <ReportLayout title="Performance Reports" description="Read-only performance (exam results aggregated)." chart={<ReportBarChart data={gradeCounts} />} stats={[{ label:"Results", value: SEED_RESULTS.length }, {label:"Published", value: SEED_RESULTS.filter((r)=>r.status==="PUBLISHED").length }]} onExport={()=>alert("Export")}>
      <DataTable data={gradeCounts} columns={[
        { id:"label", header:"Grade", accessor:(r: typeof gradeCounts[number])=>r.label},
        { id:"value", header:"Count", accessor:(r: typeof gradeCounts[number])=>r.value},
      ] as never} getRowId={(r)=>r.label} />
    </ReportLayout>
  );
}
