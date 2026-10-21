import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listGuardians } from "@/lib/api/students";
import type { ApiGuardianSummary } from "@/lib/api/types";

export default async function GuardiansPage() {
  let rows: ApiGuardianSummary[] = [];
  let error = "";
  try {
    rows = await listGuardians();
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Unable to load guardians";
  }
  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-semibold">Guardians</h1><p className="text-sm text-muted-foreground">Guardian accounts and student links from the Academic API.</p></div>
      {error ? <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
      {!error && rows.length === 0 ? <EmptyState title="No guardians" description="Guardian records will appear after admissions are submitted." /> : null}
      {rows.length > 0 ? <Card><CardContent className="overflow-x-auto p-0"><table className="w-full text-sm"><thead className="bg-muted/50 text-muted-foreground"><tr><th className="px-4 py-2 text-left font-medium">Guardian</th><th className="px-4 py-2 text-left font-medium">Phone</th><th className="px-4 py-2 text-left font-medium">Email</th><th className="px-4 py-2 text-left font-medium">Linked students</th></tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.id}><td className="px-4 py-2 font-medium">{row.firstName} {row.lastName ?? ""}</td><td className="px-4 py-2">{row.phone ?? "—"}</td><td className="px-4 py-2">{row.email ?? "—"}</td><td className="px-4 py-2"><Badge variant={row._count.students > 0 ? "success" : "muted"}>{row._count.students}</Badge></td></tr>)}</tbody></table></CardContent></Card> : null}
    </div>
  );
}
