import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listEnrollments } from "@/lib/api/students";
import type { ApiEnrollmentRecord } from "@/lib/api/types";

export default async function EnrollmentsPage() {
  let rows: ApiEnrollmentRecord[] = [];
  let error = "";
  try {
    rows = await listEnrollments();
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Unable to load enrollments";
  }
  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-semibold">Enrollments</h1><p className="text-sm text-muted-foreground">Live enrollment records from the Academic API.</p></div>
      {error ? <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
      {!error && rows.length === 0 ? <EmptyState title="No enrollments" description="Enrollment records will appear after admissions are submitted." /> : null}
      {rows.length > 0 ? <Card><CardContent className="overflow-x-auto p-0"><table className="w-full text-sm"><thead className="bg-muted/50 text-muted-foreground"><tr><th className="px-4 py-2 text-left font-medium">Student</th><th className="px-4 py-2 text-left font-medium">Class</th><th className="px-4 py-2 text-left font-medium">Year</th><th className="px-4 py-2 text-left font-medium">Status</th><th className="px-4 py-2 text-left font-medium">Enrolled</th></tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.id}><td className="px-4 py-2"><span className="font-medium">{row.student.firstName} {row.student.lastName ?? ""}</span><span className="ml-2 font-mono text-xs text-muted-foreground">{row.student.roleNumber}</span></td><td className="px-4 py-2">{row.schoolClass?.className ?? "—"}</td><td className="px-4 py-2">{row.academicYear?.name ?? "—"}</td><td className="px-4 py-2"><Badge variant={row.status === "ACTIVE" ? "success" : "muted"}>{row.status}</Badge></td><td className="px-4 py-2">{new Date(row.enrolledOn).toLocaleDateString()}</td></tr>)}</tbody></table></CardContent></Card> : null}
    </div>
  );
}
