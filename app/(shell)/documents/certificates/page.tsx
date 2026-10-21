"use client";

import { DocGenerator } from "@/components/ui/doc-generator";
import { useMockStore } from "@/lib/mock/hooks";

export default function CertificatesPage(){
  const { store } = useMockStore();
  const options = store.students.map((s)=>({ id: s.id, label: `${s.fullname} — ${s.roleNumber}`, eligible: s.status==="GRADUATED", hint: s.status==="GRADUATED"?"Eligible for certificate":"Only graduated eligible — finalize promotion first" }));
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Certificates</h1>
      <p className="text-sm text-muted-foreground">Certificates can only be generated for graduated/eligible students (§3). No data entry — generation + export only.</p>
      <DocGenerator
        title="Generate certificate"
        description="Picker → preview → generate/export"
        options={options}
        docTypes={["Completion Certificate","Conduct Certificate","Transfer Certificate"]}
        onGenerate={(id, type)=>alert(`Generated ${type} for ${id} — mock PDF`)}
        preview={(id, type)=> <div className="text-sm"><p>Preview: {type}</p><p className="text-muted-foreground">Student: {store.students.find((s)=>s.id===id)?.fullname} ({store.students.find((s)=>s.id===id)?.roleNumber})</p></div>}
      />
    </div>
  );
}
