"use client";

import * as React from "react";
import { Printer, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { getExam, listExams, listExamRooms } from "@/lib/api/exams";
import type { ApiExam, ApiRoomAssignment } from "@/lib/api/types";
import { academicErrorMessage } from "@/components/academics/academic-utils";

export function HallTicketsClient() {
  const [exams, setExams] = React.useState<ApiExam[]>([]);
  const [examId, setExamId] = React.useState("");
  const [examName, setExamName] = React.useState("");
  const [rooms, setRooms] = React.useState<ApiRoomAssignment[]>([]);
  const [roomId, setRoomId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [roomsLoading, setRoomsLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    listExams({ page: 1, limit: 100 })
      .then((res) => setExams(res.data))
      .catch((cause) => setError(academicErrorMessage(cause, "Unable to load exams")))
      .finally(() => setLoading(false));
  }, []);

  async function handleExamChange(id: string) {
    setExamId(id);
    setRoomId("");
    setRooms([]);
    const exam = exams.find((e) => e.id === id);
    setExamName(exam?.name ?? "");
    if (!id) return;
    setRoomsLoading(true);
    try {
      const [full, assigned] = await Promise.all([getExam(id), listExamRooms(id)]);
      setExamName(full.name);
      setRooms(assigned);
      if (assigned.length === 1) setRoomId(assigned[0].id);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to load rooms"));
    } finally {
      setRoomsLoading(false);
    }
  }

  const room = rooms.find((r) => r.id === roomId);
  const students = React.useMemo(() => [...(room?.students ?? [])], [room]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Examination Center · Room Tickets
        </p>
        <h1 className="text-xl font-semibold tracking-tight mt-1">Hall Tickets</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tickets generate only for seated students. Pick an exam and a room, then print.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-12 w-full" />
        </div>
      ) : exams.length === 0 ? (
        <EmptyState
          title="No exams yet"
          description="Create an exam and assign rooms before generating hall tickets."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 print:hidden">
<div className="space-y-2">
              <span className="text-sm font-medium">Exam</span>
              <Select value={examId} onValueChange={(v) => void handleExamChange(v)}>
                <SelectTrigger><SelectValue placeholder="Select an exam…" /></SelectTrigger>
                <SelectContent>
                  {exams.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {examId && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {exams.find((e) => e.id === examId)?.name ?? "—"}
                </p>
              )}
            </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">Room</span>
            {!examId || roomsLoading ? (
              <div className="flex h-9 w-full items-center rounded-lg border border-input bg-muted px-3 py-1 text-sm text-muted-foreground">
                {!examId ? "Select an exam first" : "Loading…"}
              </div>
            ) : (
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a room…" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.hall?.name ?? "Hall"} · {r.students?.length ?? 0} seated
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      )}

      {examId && !roomsLoading && rooms.length === 0 ? (
        <EmptyState
          title="No rooms assigned"
          description="Assign at least one hall on the exam page before generating tickets."
        />
      ) : null}

      {room ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-3 justify-between items-center print:hidden">
              <CardTitle className="text-sm flex items-center gap-2">
                <Ticket size={14} className="text-muted-foreground" aria-hidden />
                {examName} · {room.hall?.name ?? "Hall"} · {students.length} ticket{students.length === 1 ? "" : "s"}
              </CardTitle>
              <Button type="button" size="sm" onClick={() => window.print()}>
                <Printer size={14} /> Print all
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground">No students seated in this room.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-4">
                {students.map((s) => (
                  <div key={s.studentId} className="rounded-lg border p-4 space-y-1.5 break-inside-avoid">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate">
                        {s.student ? `${s.student.firstName} ${s.student.lastName ?? ""}`.trim() : s.studentId.slice(0, 8)}
                      </p>
                      <Badge variant="secondary" className="font-mono">Seat {s.seatOrder}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {s.student?.roleNumber ?? "—"}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
                      <Badge variant="outline">{examName}</Badge>
                      <Badge variant="outline">{room.hall?.name ?? "Hall"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
