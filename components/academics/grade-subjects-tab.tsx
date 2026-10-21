"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { assignSubjectToClasses, removeClassSubject } from "@/lib/api/subjects";
import type { ApiClassSubject, ApiSchoolClass, ApiSubject, ApiTeacher } from "@/lib/api/types";
import { academicErrorMessage } from "./academic-utils";
import { SubjectGradeAssignDialog } from "./subject-grade-assign-dialog";
import type { GradeKey } from "./grade-keys";

function teacherDisplayName(teacherId: string | null | undefined, teachers: ApiTeacher[]): string {
  if (!teacherId) return "—";
  const teacher = teachers.find((candidate) => candidate.id === teacherId);
  if (!teacher) return "—";
  return [teacher.user?.firstName, teacher.user?.lastName].filter(Boolean).join(" ") || teacher.employeeNumber || "Teacher";
}

type SubjectRow = {
  subjectId: string;
  subjectName: string;
  classIds: string[];
  classNames: string[];
  teacherNames: string[];
};

export function GradeSubjectsTab({
  grade,
  gradeClasses,
  subjects,
  teachers,
  assignmentsByClass,
  onChanged,
}: {
  grade: GradeKey;
  gradeClasses: ApiSchoolClass[];
  subjects: ApiSubject[];
  teachers: ApiTeacher[];
  assignmentsByClass: Record<string, ApiClassSubject[]>;
  onChanged: () => void;
}) {
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignPending, setAssignPending] = React.useState(false);
  const [assignError, setAssignError] = React.useState("");
  const [unassignTarget, setUnassignTarget] = React.useState<SubjectRow | null>(null);
  const [unassignPending, setUnassignPending] = React.useState(false);
  const [error, setError] = React.useState("");

  const rows: SubjectRow[] = React.useMemo(() => {
    const bySubject = new Map<string, SubjectRow>();
    for (const schoolClass of gradeClasses) {
      for (const assignment of assignmentsByClass[schoolClass.id] ?? []) {
        const name =
          assignment.subject?.name ?? subjects.find((s) => s.id === assignment.subjectId)?.name ?? "Subject";
        const existing = bySubject.get(assignment.subjectId);
        if (existing) {
          existing.classIds.push(schoolClass.id);
          existing.classNames.push(schoolClass.className);
          existing.teacherNames.push(teacherDisplayName(assignment.teacherId, teachers));
        } else {
          bySubject.set(assignment.subjectId, {
            subjectId: assignment.subjectId,
            subjectName: name,
            classIds: [schoolClass.id],
            classNames: [schoolClass.className],
            teacherNames: [teacherDisplayName(assignment.teacherId, teachers)],
          });
        }
      }
    }
    return [...bySubject.values()].sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [gradeClasses, assignmentsByClass, subjects, teachers]);

  const handleGradeAssign = async (subjectId: string, classIds: string[]) => {
    setAssignPending(true);
    setAssignError("");
    try {
      const result = await assignSubjectToClasses(subjectId, classIds);
      onChanged();
      return { assigned: result.assigned, total: classIds.length };
    } catch (cause) {
      setAssignError(academicErrorMessage(cause, "Unable to assign subject"));
      throw cause;
    } finally {
      setAssignPending(false);
    }
  };

  const handleUnassign = async () => {
    if (!unassignTarget) return;
    setUnassignPending(true);
    setError("");
    try {
      const ids: string[] = [];
      for (const classId of unassignTarget.classIds) {
        const row = (assignmentsByClass[classId] ?? []).find((a) => a.subjectId === unassignTarget.subjectId);
        if (row) ids.push(row.id);
      }
      for (const id of ids) {
        await removeClassSubject(id);
      }
      setUnassignTarget(null);
      onChanged();
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to unassign subject"));
    } finally {
      setUnassignPending(false);
    }
  };

  const columns: Column<SubjectRow>[] = [
    {
      id: "subject",
      header: "Subject",
      accessor: (row) => <span className="font-medium">{row.subjectName}</span>,
      sortable: true,
    },
    {
      id: "classes",
      header: "Classes",
      accessor: (row) => (
        <span className="flex flex-wrap gap-1">
          {row.classNames.map((name) => (
            <Badge key={name} variant="secondary">{name}</Badge>
          ))}
        </span>
      ),
    },
    {
      id: "teachers",
      header: "Teachers",
      accessor: (row) => <span className="text-sm text-muted-foreground">{[...new Set(row.teacherNames)].join(", ")}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Subjects attached to classes in this grade. Teachers are assigned per class on the Teachers tab.
        </p>
        <Button type="button" size="sm" onClick={() => { setAssignError(""); setAssignOpen(true); }} disabled={assignPending}>
          <Plus size={14} /> Assign subject to grade
        </Button>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title="No subjects in this grade" description="Attach the first subject to every class in the grade at once." action={{ label: "Assign subject to grade", onClick: () => setAssignOpen(true) }} />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.subjectId}
          rowActions={[
            { label: "Unassign from grade", icon: <Trash2 size={14} />, variant: "destructive", onClick: (row) => { if (!unassignPending) setUnassignTarget(row); } },
          ]}
          emptyTitle="No subjects found"
          emptyDescription="No subject assignments in this grade."
        />
      )}

      <SubjectGradeAssignDialog
        key={assignOpen ? "open" : "closed"}
        open={assignOpen}
        onOpenChange={(open) => { if (!assignPending) { setAssignOpen(open); if (!open) setAssignError(""); } }}
        subject={null}
        subjects={subjects}
        fixedGrade={{ level: grade.level, grade: grade.grade }}
        onSubmit={handleGradeAssign}
        pending={assignPending}
        error={assignError}
      />

      <AlertDialog open={!!unassignTarget} onOpenChange={(open) => { if (!open && !unassignPending) setUnassignTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign {unassignTarget?.subjectName} from the grade?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the subject from {unassignTarget?.classNames.length ?? 0} class{unassignTarget && unassignTarget.classNames.length === 1 ? "" : "es"}
              ({unassignTarget?.classNames.join(", ")}). Timetable cells using it may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnassignTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (!unassignPending) void handleUnassign(); }}>
              {unassignPending ? "Removing…" : "Remove from grade"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
