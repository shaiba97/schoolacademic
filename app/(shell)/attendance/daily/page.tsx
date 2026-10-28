"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useMockStore } from "@/lib/mock/hooks";
import { SEED_SESSIONS, SEED_SECTIONS, SEED_CLASSES } from "@/lib/mock/seed";

type Row = { studentId: string; name: string; status: "PRESENT"|"ABSENT"|"LATE"|"EXCUSED" };

export default function DailyAttendancePage() {
  const { store } = useMockStore();
  const [sessionId, setSessionId] = React.useState(SEED_SESSIONS[0]?.id ?? "");
  const session = SEED_SESSIONS.find((s) => s.id === sessionId);
  const sectionStudents = store.students.filter((s) => s.sectionId === session?.sectionId && s.status === "ACTIVE");
  const [marks, setMarks] = React.useState<Record<string, Row["status"]>>({});

  if (!session) {
    return (
      <div className="rounded-xl border bg-card p-8">
        <h1 className="font-semibold">Daily Attendance — No session</h1>
        <p className="text-sm text-muted-foreground mt-2">Create a Session first (per class/section/date). Daily Attendance entry is disabled without an open session.</p>
      </div>
    );
  }

  const rows: Row[] = sectionStudents.map((s) => ({ studentId: s.id, name: `${s.firstName} ${s.lastName}`, status: marks[s.id] ?? "PRESENT" }));
  const columns: Column<Row>[] = [
    { id: "name", header: "Student", accessor: (r) => r.name, sortable: true },
    { id: "status", header: "Status", accessor: (r) => (
        <Select value={r.status} onChange={(e) => setMarks((m) => ({ ...m, [r.studentId]: e.target.value as Row["status"] }))} className="h-8">
          <option value="PRESENT">Present</option>
          <option value="ABSENT">Absent</option>
          <option value="LATE">Late</option>
          <option value="EXCUSED">Excused</option>
        </Select>
      ) },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Daily Attendance</h1>
      <p className="text-sm text-muted-foreground">Data-entry vs open session. Session: {SEED_CLASSES.find((c)=>c.id===SEED_SECTIONS.find((x)=>x.id===session.sectionId)?.classId)?.name} {SEED_SECTIONS.find((x)=>x.id===session.sectionId)?.name} · {session.date}</p>
      <div className="flex gap-2 items-end">
        <div className="space-y-1.5">
          <Label>Session</Label>
          <Select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            {SEED_SESSIONS.map((s) => {
              const sec = SEED_SECTIONS.find((x) => x.id === s.sectionId);
              const cls = SEED_CLASSES.find((c) => c.id === sec?.classId);
              return <option key={s.id} value={s.id}>{cls?.name} {sec?.name} — {s.date} {s.period?`P${s.period}`:""}</option>;
            })}
          </Select>
        </div>
        <Button onClick={() => alert(`Saved ${rows.length} marks for session ${sessionId}`)}>Save marks</Button>
      </div>
      {sectionStudents.length === 0 ? <p className="text-sm text-muted-foreground rounded-xl border bg-card p-6">No enrolled students in this section.</p> : <DataTable data={rows} columns={columns} getRowId={(r) => r.studentId} />}
    </div>
  );
}
