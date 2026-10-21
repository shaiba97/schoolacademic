"use client";

import * as React from "react";
import { Award, Check, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { graduateStudent } from "@/lib/api/students";
import type { ApiStudent } from "@/lib/api/types";
import { currentClassLabel, studentFullName } from "@/lib/api/mappers";

export function GraduationsClient({ initialStudents, initialError }: { initialStudents: ApiStudent[]; initialError?: string }) {
  const router = useRouter();
  const [students, setStudents] = React.useState(initialStudents);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState(initialError ?? "");
  const candidates = students.filter((student) => student.status === "ACTIVE" || student.status === "GRADUATED");

  async function graduate(student: ApiStudent) {
    setBusyId(student.id);
    setError("");
    try {
      const updated = await graduateStudent(student.id);
      setStudents((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to graduate student");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-semibold flex items-center gap-2"><Award size={20} /> Graduations</h1><p className="text-sm text-muted-foreground">Mark eligible students as graduated and complete active enrollments.</p></div>
      {error ? <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
      {candidates.length === 0 ? <EmptyState title="No graduation candidates" description="Students appear here when they are active or already graduated." /> : <Card><CardContent className="overflow-x-auto p-0"><table className="w-full text-sm"><thead className="bg-muted/50 text-muted-foreground"><tr><th className="px-4 py-2 text-left font-medium">Student</th><th className="px-4 py-2 text-left font-medium">Class</th><th className="px-4 py-2 text-left font-medium">Status</th><th className="px-4 py-2 text-right font-medium">Action</th></tr></thead><tbody className="divide-y">{candidates.map((student) => <tr key={student.id}><td className="px-4 py-2"><p className="font-medium">{studentFullName(student)}</p><p className="font-mono text-xs text-muted-foreground">{student.roleNumber}</p></td><td className="px-4 py-2">{currentClassLabel(student)}</td><td className="px-4 py-2"><Badge variant={student.status === "GRADUATED" ? "success" : "warning"}>{student.status}</Badge></td><td className="px-4 py-2 text-right">{student.status === "GRADUATED" ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Check size={14} /> Completed</span> : <Button size="sm" disabled={busyId === student.id} onClick={() => void graduate(student)}>{busyId === student.id ? <LoaderCircle size={14} className="animate-spin" /> : <Award size={14} />} Graduate</Button>}</td></tr>)}</tbody></table></CardContent></Card>}
    </div>
  );
}
