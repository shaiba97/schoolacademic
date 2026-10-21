"use client";

import { DocGenerator } from "@/components/ui/doc-generator";
import { useMockStore } from "@/lib/mock/hooks";
import { SEED_RESULTS } from "@/lib/mock/seed";

export default function AcademicDocsPage(){
  const { store } = useMockStore();
  const hasPublished = SEED_RESULTS.some((r)=>r.status==="PUBLISHED");
  const options = store.students.filter((s)=>s.status==="ACTIVE").map((s)=>({ id: s.id, label: `${s.fullname} — ${s.roleNumber}`, eligible: hasPublished, hint: hasPublished?"Published results available":"Requires published Results/Report Cards" }));
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Academic Documents</h1>
      <p className="text-sm text-muted-foreground">Transcripts pull from published Results/Report Cards. No data entry — generation + export only.</p>
      <DocGenerator
        title="Generate academic document"
        description="Picker → preview → generate/export (uses pdf capability)"
        options={options}
        docTypes={["Transcript","Mark Sheet","Bonafide"]}
        onGenerate={(id, type)=>alert(`Generated ${type} for ${id}`)}
        preview={(id, type)=> <div className="text-sm"><p>{type} preview for {store.students.find((s)=>s.id===id)?.fullname}</p><p className="text-muted-foreground">Source: published results ({SEED_RESULTS.filter((r)=>r.status==="PUBLISHED").length} records)</p></div>}
      />
    </div>
  );
}
