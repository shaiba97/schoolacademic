"use client";

import { ReportLayout } from "@/components/ui/report-layout";
import { DataTable } from "@/components/ui/data-table";
import { SEED_CLASSES, SEED_SECTIONS } from "@/lib/mock/seed";

const rows = SEED_CLASSES.map((c)=>({ cls: c.name, sections: SEED_SECTIONS.filter((s)=>s.classId===c.id).length }));
export default function RAcademicPage(){
  return (
    <ReportLayout title="Academic Reports" description="Read-only academic (years/terms/classes load)." stats={[{ label:"Classes", value: SEED_CLASSES.length },{ label:"Sections", value: SEED_SECTIONS.length }]} onExport={()=>alert("Export")}>
      <DataTable data={rows} columns={[
        { id:"cls", header:"Class", accessor:(r: typeof rows[number])=>r.cls },
        { id:"sections", header:"Sections", accessor:(r: typeof rows[number])=>r.sections },
      ] as never} getRowId={(r)=>r.cls} />
    </ReportLayout>
  );
}
