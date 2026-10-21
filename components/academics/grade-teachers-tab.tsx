"use client";

import * as React from "react";
import { Pencil, Plus, UserMinus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Label, Select } from "@/components/ui/input";
import { updateClassSubjectTeacher } from "@/lib/api/subjects";
import type { ApiClassSubject, ApiSchoolClass, ApiSubject, ApiTeacher } from "@/lib/api/types";
import { academicErrorMessage } from "./academic-utils";
import { SubjectAssignDialog } from "./subject-assign-dialog";

export function teacherDisplayName(teacher: ApiTeacher): string {
  return [teacher.user?.firstName, teacher.user?.lastName].filter(Boolean).join(" ") || teacher.employeeNumber || "Teacher";
}

function assignedTeacherName(assignment: ApiClassSubject, teachers: ApiTeacher[]): string {
  const teacher = assignment.teacherId
    ? teachers.find((candidate) => candidate.id === assignment.teacherId)
    : undefined;
  if (teacher) return teacherDisplayName(teacher);
  if (assignment.teacher?.user) {
    const nested = assignment.teacher.user;
    return [nested.firstName, nested.lastName].filter(Boolean).join(" ") || "Teacher";
  }
  return "—";
}

type TeacherRow = {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId?: string | null;
  teacherName: string;
};

export function GradeTeachersTab({
  gradeClasses,
  subjects,
  teachers,
  assignmentsByClass,
  onChanged,
}: {
  gradeClasses: ApiSchoolClass[];
  subjects: ApiSubject[];
  teachers: ApiTeacher[];
  assignmentsByClass: Record<string, ApiClassSubject[]>;
  onChanged: () => void;
}) {
  const [editing, setEditing] = React.useState<TeacherRow | null>(null);
  const [setOpen, setSetOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");

  const classNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const schoolClass of gradeClasses) map.set(schoolClass.id, schoolClass.className);
    return map;
  }, [gradeClasses]);

  const rows: TeacherRow[] = React.useMemo(() => {
    const list: TeacherRow[] = [];
    for (const schoolClass of gradeClasses) {
      for (const assignment of assignmentsByClass[schoolClass.id] ?? []) {
        const subjectName =
          assignment.subject?.name ?? subjects.find((s) => s.id === assignment.subjectId)?.name ?? "Subject";
        list.push({
          id: assignment.id,
          classId: schoolClass.id,
          className: classNameById.get(schoolClass.id) ?? schoolClass.className,
          subjectId: assignment.subjectId,
          subjectName,
          teacherId: assignment.teacherId,
          teacherName: assignedTeacherName(assignment, teachers),
        });
      }
    }
    // Unassigned rows first so the work queue is visible, then by teacher.
    return list.sort(
      (a, b) =>
        Number(!a.teacherId) - Number(!b.teacherId) ||
        a.teacherName.localeCompare(b.teacherName) ||
        a.className.localeCompare(b.className),
    );
  }, [gradeClasses, assignmentsByClass, subjects, teachers, classNameById]);

  const handleSaveTeacher = async (values: { subjectId: string; teacherId?: string }) => {
    if (!editing) return;
    setPending(true);
    setError("");
    try {
      await updateClassSubjectTeacher(editing.id, values.teacherId || undefined);
      setEditing(null);
      onChanged();
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to assign teacher"));
      throw cause;
    } finally {
      setPending(false);
    }
  };

  const handleClearTeacher = async (row: TeacherRow) => {
    if (!row.teacherId || pending) return;
    setPending(true);
    setError("");
    try {
      await updateClassSubjectTeacher(row.id, null);
      onChanged();
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to remove teacher"));
    } finally {
      setPending(false);
    }
  };

  const columns: Column<TeacherRow>[] = [
    {
      id: "teacher",
      header: "Teacher",
      accessor: (row) =>
        row.teacherId ? (
          <span className="font-medium">{row.teacherName}</span>
        ) : (
          <Badge variant="muted">Unassigned</Badge>
        ),
      sortable: true,
    },
    {
      id: "class",
      header: "Class",
      accessor: (row) => <span>{row.className}</span>,
      sortable: true,
    },
    {
      id: "subject",
      header: "Subject",
      accessor: (row) => <span>{row.subjectName}</span>,
      sortable: true,
    },
  ];

  const editingSubject = editing
    ? subjects.find((s) => s.id === editing.subjectId) ?? null
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <p className="text-sm text-muted-foreground">
          One teacher per class and subject — the same subject may have different teachers in different classes.
        </p>
        <Button type="button" size="sm" onClick={() => { setError(""); setSetOpen(true); }} disabled={pending || rows.length === 0}>
          <Plus size={14} /> Set teacher
        </Button>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title="No assignments in this grade" description="Assign subjects to the grade first, then set a teacher per class and subject here." />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          rowActions={[
            { label: "Change teacher", icon: <Pencil size={14} />, onClick: (row) => { if (!pending) { setError(""); setEditing(row); } } },
            { label: "Remove teacher", icon: <UserMinus size={14} />, onClick: (row) => { void handleClearTeacher(row); } },
          ]}
          emptyTitle="No assignments found"
          emptyDescription="No class-subject rows in this grade."
        />
      )}

      {editing ? (
        <SubjectAssignDialog
          key={editing.id}
          open={!!editing}
          onOpenChange={(open) => { if (!pending && !open) setEditing(null); }}
          subjects={editingSubject ? [editingSubject] : []}
          assignedSubjectIds={new Set()}
          teachers={teachers}
          onSubmit={handleSaveTeacher}
          pending={pending}
          error={error}
          editing={{ subjectId: editing.subjectId, teacherId: editing.teacherId }}
          track={gradeClasses.find((c) => c.id === editing.classId)?.track ?? null}
        />
      ) : null}

      {setOpen ? (
        <SetTeacherDialog
          gradeClasses={gradeClasses}
          subjects={subjects}
          teachers={teachers}
          assignmentsByClass={assignmentsByClass}
          onClose={() => setSetOpen(false)}
          onSaved={() => {
            setSetOpen(false);
            onChanged();
          }}
        />
      ) : null}
    </div>
  );
}

function teacherOptionLabel(teacher: ApiTeacher): string {
  return [teacher.user?.firstName, teacher.user?.lastName].filter(Boolean).join(" ") || teacher.employeeNumber || "Teacher";
}

/**
 * Standalone set-teacher flow: pick a class in this grade, then one of its
 * assigned subjects, then the teacher. Department-filtered like the
 * single-class dialog.
 */
function SetTeacherDialog({
  gradeClasses,
  subjects,
  teachers,
  assignmentsByClass,
  onClose,
  onSaved,
}: {
  gradeClasses: ApiSchoolClass[];
  subjects: ApiSubject[];
  teachers: ApiTeacher[];
  assignmentsByClass: Record<string, ApiClassSubject[]>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [classId, setClassId] = React.useState("");
  const [assignmentId, setAssignmentId] = React.useState("");
  const [teacherId, setTeacherId] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  const classAssignments = classId ? (assignmentsByClass[classId] ?? []) : [];
  const selectedAssignment = classAssignments.find((a) => a.id === assignmentId) ?? null;
  const selectedSubject = selectedAssignment
    ? subjects.find((s) => s.id === selectedAssignment.subjectId) ?? null
    : null;
  const teacherOptions = React.useMemo(() => {
    if (!selectedSubject?.departmentId) return teachers;
    return teachers.filter((teacher) => teacher.departmentId === selectedSubject.departmentId);
  }, [selectedSubject, teachers]);

  function currentTeacherLabel(assignment: ApiClassSubject): string {
    if (!assignment.teacherId) return "Unassigned";
    const teacher = teachers.find((t) => t.id === assignment.teacherId);
    return teacher ? teacherOptionLabel(teacher) : "Assigned";
  }

  function subjectName(assignment: ApiClassSubject): string {
    return assignment.subject?.name ?? subjects.find((s) => s.id === assignment.subjectId)?.name ?? "Subject";
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedAssignment || !teacherId) {
      setFormError("Pick a class, a subject, and a teacher.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      await updateClassSubjectTeacher(selectedAssignment.id, teacherId);
      onSaved();
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to assign teacher"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!pending && !o) onClose(); }}>
      <DialogContent open onOpenChange={(o) => { if (!pending && !o) onClose(); }} className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Set teacher</DialogTitle>
          <DialogDescription>Choose a class, one of its subjects, then the teacher for that class and subject.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4 p-6 pt-0" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-1.5">
            <Label htmlFor="set-teacher-class">Class</Label>
            <Select
              id="set-teacher-class"
              value={classId}
              onChange={(event) => { setClassId(event.target.value); setAssignmentId(""); setTeacherId(""); }}
            >
              <option value="">Select class</option>
              {gradeClasses.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.className}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-teacher-subject">Subject</Label>
            <Select
              id="set-teacher-subject"
              value={assignmentId}
              onChange={(event) => { setAssignmentId(event.target.value); setTeacherId(""); }}
              disabled={!classId}
            >
              <option value="">{classId ? "Select subject" : "Select a class first"}</option>
              {classAssignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {subjectName(assignment)} ({currentTeacherLabel(assignment)})
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-teacher-teacher">Teacher</Label>
            <Select
              id="set-teacher-teacher"
              value={teacherId}
              onChange={(event) => setTeacherId(event.target.value)}
              disabled={!selectedAssignment}
            >
              <option value="">{selectedAssignment ? "Select teacher" : "Select a subject first"}</option>
              {teacherOptions.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacherOptionLabel(teacher)}</option>
              ))}
            </Select>
            {selectedAssignment && teacherOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No teacher in this subject&apos;s department.</p>
            ) : null}
          </div>
          {formError ? (
            <p role="alert" className="text-sm text-destructive">{formError}</p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !selectedAssignment || !teacherId}>
              {pending ? "Saving…" : "Set teacher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
