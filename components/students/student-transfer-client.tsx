"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Check, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { archiveStudent, transferStudent } from "@/lib/api/students";
import type { ApiReferenceData, ApiStudent } from "@/lib/api/types";
import { currentClassLabel, studentFullName } from "@/lib/api/mappers";

export function StudentTransferClient({ initialStudents, reference, initialError, initialStudentId }: { initialStudents: ApiStudent[]; reference: ApiReferenceData | null; initialError?: string; initialStudentId?: string }) {
  const router = useRouter();
  const [students] = React.useState(initialStudents);
  const [studentId, setStudentId] = React.useState(
    initialStudentId && initialStudents.some((s) => s.id === initialStudentId)
      ? initialStudentId
      : (initialStudents[0]?.id ?? ""),
  );
  const [classId, setClassId] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [type, setType] = React.useState<"internal" | "exit">("internal");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(initialError ?? "");
  const selectedStudent = students.find((student) => student.id === studentId);
  const currentClassId = selectedStudent?.enrollments?.[0]?.schoolClass?.id ?? "";
  const targetClasses = (reference?.classes ?? []).filter((schoolClass) => schoolClass.id !== currentClassId);

  async function submit() {
    if (!selectedStudent) return;
    if (type === "internal" && !classId) {
      setError("Choose a target class");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (type === "exit") await archiveStudent(selectedStudent.id);
      else await transferStudent(selectedStudent.id, classId);
      router.push("/students/all");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to complete transfer");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-semibold">Transfers</h1><p className="text-sm text-muted-foreground">Move an active student to another class or close their enrollment when leaving school.</p></div>
      {error ? <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
      {students.length === 0 ? <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">No active students are available for transfer.</div> : null}
      {students.length > 0 ? <Card><CardHeader><CardTitle className="text-base">Transfer student</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="transfer-student">Student</Label><Select id="transfer-student" value={studentId} onChange={(event) => { setStudentId(event.target.value); setClassId(""); }}><option value="">Select student</option>{students.map((student) => <option key={student.id} value={student.id}>{studentFullName(student)} · {student.roleNumber} · {currentClassLabel(student)}</option>)}</Select></div><div className="space-y-1.5"><Label htmlFor="transfer-type">Transfer type</Label><Select id="transfer-type" value={type} onChange={(event) => setType(event.target.value as "internal" | "exit")}><option value="internal">Internal transfer</option><option value="exit">Exit school</option></Select></div></div>{type === "internal" ? <div className="space-y-1.5"><Label htmlFor="transfer-class">Target class</Label><Select id="transfer-class" value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">Select class</option>{targetClasses.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.className}</option>)}</Select></div> : <div className="flex items-center gap-2 rounded-lg border bg-warning/10 p-3 text-sm text-warning"><LogOut size={16} /> This will mark the student as withdrawn and close active enrollment.</div>}<div className="space-y-1.5"><Label htmlFor="transfer-reason">Reason</Label><Input id="transfer-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Parent request" /></div><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowRightLeft size={15} /> {selectedStudent ? currentClassLabel(selectedStudent) : "Select a student"}</div><Button onClick={() => void submit()} disabled={submitting || !selectedStudent || (type === "internal" && !classId)}>{submitting ? "Saving…" : type === "exit" ? "Close enrollment" : "Transfer student"} <Check size={14} /></Button></div></CardContent></Card> : null}
    </div>
  );
}
