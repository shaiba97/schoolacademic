"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { getHall } from "@/lib/api/halls";
import { getExam, listExams, listExamRooms, assignExamRoom, removeExamRoom } from "@/lib/api/exams";
import { listStudents } from "@/lib/api/students";
import { studentFullName } from "@/lib/api/mappers";
import { academicErrorMessage } from "@/components/academics/academic-utils";
import type { ApiExam, ApiHall, ApiRoomAssignment, ApiStudent } from "@/lib/api/types";

function hallRoomNumber(hallName: string): string | null {
  const match = hallName.match(/Room (\d+)$/);
  return match ? match[1] : null;
}

function studentClassIds(student: ApiStudent): string[] {
  return (student.enrollments ?? [])
    .filter((e) => e.status === "ACTIVE")
    .map((e) => e.schoolClass?.id)
    .filter((id): id is string => typeof id === "string");
}

export function RoomSeatingClient({ hallId }: { hallId: string }) {
  const [hall, setHall] = React.useState<ApiHall | null>(null);
  const [exams, setExams] = React.useState<ApiExam[]>([]);
  const [students, setStudents] = React.useState<ApiStudent[]>([]);
  const [examId, setExamId] = React.useState("");
  const [assignment, setAssignment] = React.useState<ApiRoomAssignment | null>(null);
  const [checkedIds, setCheckedIds] = React.useState<string[]>([]);
  const [examClassIds, setExamClassIds] = React.useState<string[] | null>(null);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [savedNotice, setSavedNotice] = React.useState("");

  React.useEffect(() => {
    Promise.allSettled([getHall(hallId), listExams({ page: 1, limit: 100 }), listStudents({ page: 1, limit: 500, status: "ACTIVE" })])
      .then(([hallResult, examsResult, studentsResult]) => {
        if (hallResult.status === "rejected") {
          setLoadError(academicErrorMessage(hallResult.reason, "Unable to load this room."));
        } else {
          setHall(hallResult.value);
        }
        if (examsResult.status === "fulfilled") {
          const rows = examsResult.value.data;
          setExams(rows);
          if (rows.length === 1) setExamId(rows[0].id);
        }
        if (studentsResult.status === "fulfilled") {
          setStudents(studentsResult.value.data);
        }
      })
      .finally(() => setLoading(false));
  }, [hallId]);

  React.useEffect(() => {
    setAssignment(null);
    setCheckedIds([]);
    setExamClassIds(null);
    setFormError("");
    setSavedNotice("");
    if (!examId) return;
    Promise.all([getExam(examId), listExamRooms(examId)])
      .then(([exam, rooms]) => {
        const classIds = Array.from(
          new Set(
            (exam.examSubjects ?? [])
              .map((s) => s.classSubject?.classId)
              .filter((id): id is string => typeof id === "string"),
          ),
        );
        setExamClassIds(classIds.length > 0 ? classIds : null);
        const mine = rooms.find((r) => r.hallId === hallId) ?? null;
        setAssignment(mine);
        setCheckedIds((mine?.students ?? []).map((s) => s.studentId));
      })
      .catch((cause) => setFormError(academicErrorMessage(cause, "Unable to load room seating for this exam.")));
  }, [examId, hallId]);

  const assignedStudentIds = React.useMemo(
    () => new Set((assignment?.students ?? []).map((s) => s.studentId)),
    [assignment],
  );

  // "Each and every student going to sit" = actively-enrolled students of the
  // exam's classes. Falls back to the full roster when the exam has no class
  // context or enrollment data is missing.
  const roster = React.useMemo(() => {
    if (!examClassIds) return students;
    const scoped = students.filter((s) => studentClassIds(s).some((id) => examClassIds.includes(id)));
    return scoped.length > 0 ? scoped : [];
  }, [students, examClassIds]);

  const shownStudents = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((s) => studentFullName(s).toLowerCase().includes(q) || (s.roleNumber ?? "").toLowerCase().includes(q));
  }, [roster, search]);

  async function handleSave() {
    if (!examId) {
      setFormError("Select an exam first.");
      return;
    }
    setSaving(true);
    setFormError("");
    setSavedNotice("");
    try {
      // The backend has no "replace students" route: an existing assignment is
      // deleted and re-created with the new seat list (seatOrder in order).
      if (assignment) {
        await removeExamRoom(examId, assignment.id);
      }
      if (checkedIds.length === 0) {
        setAssignment(null);
        setSavedNotice("Seating cleared — no students are seated in this room for the exam.");
      } else {
        const updated = await assignExamRoom(examId, { hallId, studentIds: checkedIds });
        setAssignment(updated);
        setCheckedIds((updated.students ?? []).map((s) => s.studentId));
        setSavedNotice(`Seating saved — ${(updated.students ?? []).length} student(s) in this room for the exam.`);
      }
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Seating could not be saved."));
      listExamRooms(examId)
        .then((rooms) => {
          const mine = rooms.find((r) => r.hallId === hallId) ?? null;
          setAssignment(mine);
          setCheckedIds((mine?.students ?? []).map((s) => s.studentId));
        })
        .catch(() => {});
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!hall) {
    return (
      <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        <p className="font-medium">Room not found</p>
        <Link href="/exams/rooms" className="mt-2 inline-block text-sm underline">
          ← Back to rooms
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Examination Center · Room Wizard</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            {hall.name}
            {hallRoomNumber(hall.name) ? (
              <span className="font-normal text-muted-foreground"> · Room №{hallRoomNumber(hall.name)}</span>
            ) : null}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Capacity {hall.capacity} · {hall.type}</p>
        </div>
        <Link href="/exams/rooms" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Rooms
        </Link>
      </div>

      {loadError ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Exam context</CardTitle>
          <CardDescription>Seating is allocated per exam — this room sits students for the selected exam.</CardDescription>
        </CardHeader>
        <CardContent>
          {exams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exams yet — create one in the Exam Wizard first.</p>
          ) : (
            <div className="space-y-2">
              <Select value={examId} onValueChange={(v) => setExamId(v)}>
                <SelectTrigger aria-label="Exam">
                  <SelectValue placeholder="Select the exam…" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {examId && assignment ? (
                <p className="text-xs text-muted-foreground">
                  Currently seated: {assignment.students?.length ?? 0} · seat order is alphabetical from the exam classes.
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm">Seating allocation</CardTitle>
              <CardDescription>
                {examClassIds
                  ? "Students of the exam's classes are listed — check to seat, uncheck to unassign."
                  : "Check students to seat them in this room; uncheck unassigns."}
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-xs">
                <Search size={14} className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search students…"
                  aria-label="Search students"
                  className="ps-8"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={shownStudents.length === 0 || saving}
                  onClick={() =>
                    setCheckedIds((current) =>
                      Array.from(new Set([...current, ...shownStudents.map((s) => s.id)])),
                    )
                  }
                >
                  Seat all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={checkedIds.length === 0 || saving}
                  onClick={() => setCheckedIds([])}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {shownStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {!examId
                ? "Select an exam to list the students sitting for it."
                : students.length === 0
                  ? "No active students found."
                  : "No active students match the exam's classes."}
            </p>
          ) : (
            <div className="max-h-96 space-y-1.5 overflow-y-auto pe-1">
              {shownStudents.map((s) => {
                const checked = checkedIds.includes(s.id);
                const already = assignedStudentIds.has(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg border p-2.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 rounded border"
                      checked={checked}
                      onChange={(e) =>
                        setCheckedIds((current) =>
                          e.target.checked
                            ? [...current, s.id]
                            : current.filter((id) => id !== s.id),
                        )
                      }
                      aria-label={`${studentFullName(s)} in ${hall.name}`}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">{studentFullName(s)}</span>
                    <span className="text-xs text-muted-foreground">{s.roleNumber ?? "—"}</span>
                    {already ? <Badge variant="secondary">Seated</Badge> : null}
                  </label>
                );
              })}
            </div>
          )}

          {formError ? (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </p>
          ) : null}
          {savedNotice ? (
            <p role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              {savedNotice}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {checkedIds.length} student(s) selected of {roster.length}
              {examClassIds ? ` (students of ${examClassIds.length} class${examClassIds.length === 1 ? "" : "es"} sitting this exam)` : ""}.
            </p>
          )}

          <div className="flex justify-end">
            <Button type="button" onClick={handleSave} disabled={saving || !examId}>
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden /> Saving…
                </>
              ) : (
                "Save seating"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
