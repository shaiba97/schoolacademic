"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, GraduationCap, Pencil, Trash2, Users } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { studentFullName } from "@/lib/api/mappers";
import { removeClassSubject, updateClassSubjectTeacher } from "@/lib/api/subjects";
import { GRADES, gradeDetailHref } from "./grade-keys";
import { updateClass } from "@/lib/api/classes";
import { academicErrorMessage } from "./academic-utils";
import type { ApiClassSubject, ApiSchoolClass, ApiStudent, ApiSubject, ApiTeacher, ApiTimetableEntry, TimetableTypeId } from "@/lib/api/types";
import { ClassWeekEditor } from "./class-week-editor";
import { SubjectAssignDialog, type SubjectAssignmentValues } from "./subject-assign-dialog";
import { TimetableScopeControls } from "./timetable-scope-controls";

export type ClassDetailsErrors = {
  subjects?: string;
  subjectAssignments?: string;
  teachers?: string;
  students?: string;
  timetable?: string;
};

type ApiClassWithDates = ApiSchoolClass & { createdAt?: string; updatedAt?: string };

type SubjectRow = {
  id: string;
  subject: string;
  teacher: string;
};

function gradeLabel(grade: string, track?: string | null) {
  const labels: Record<string, string> = { FIRST: "1st", SECOND: "2nd", THIRD: "3rd", SIXTH: "6th", SEVENTH: "7th", EIGHTH: "8th", NINTH: "9th" };
  const base = labels[grade] ?? grade;
  if (track && (grade === "SECOND" || grade === "THIRD")) return `${base} (${track === "SCIENCE" ? "Science" : "Art"})`;
  return base;
}

function teacherName(teacher: ApiTeacher) {
  return [teacher.user?.firstName, teacher.user?.lastName].filter(Boolean).join(" ") || teacher.employeeNumber || "Teacher";
}

function formatDate(value?: string) {
  if (!value) return "â€”";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function ClassDetailsClient({
  schoolClass,
  assignments: initialAssignments,
  subjects,
  teachers,
  students,
  timetable,
  errors = {},
  initialError = "",
  notFound = false,
  initialTab = "profile",
}: {
  schoolClass: ApiSchoolClass | null;
  assignments: ApiClassSubject[];
  subjects: ApiSubject[];
  teachers: ApiTeacher[];
  students: ApiStudent[];
  timetable: ApiTimetableEntry[];
  errors?: ClassDetailsErrors;
  initialError?: string;
  notFound?: boolean;
  initialTab?: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const [assignments, setAssignments] = React.useState(initialAssignments);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignPending, setAssignPending] = React.useState(false);
  const [editingAssignment, setEditingAssignment] = React.useState<{ id: string; subjectId: string; teacherId?: string | null } | null>(null);
  const [actionError, setActionError] = React.useState("");
  const [deleteAssignmentId, setDeleteAssignmentId] = React.useState<string | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);
  const [supervisorId, setSupervisorId] = React.useState(schoolClass?.classTeacherId ?? "");
  const [supervisorPending, setSupervisorPending] = React.useState(false);
  const [timetableScope, setTimetableScope] = React.useState<{ timetableType: TimetableTypeId; examName: string; periodsPerDay: number }>({ timetableType: "REGULAR", examName: "", periodsPerDay: 7 });

  const handleUpdateSubject = async (values: SubjectAssignmentValues) => {
    if (!editingAssignment || assignPending) return;
    setAssignPending(true);
    try {
      const saved = await updateClassSubjectTeacher(editingAssignment.id, values.teacherId || undefined);
      setAssignments((current) => current.map((assignment) => (assignment.id === saved.id ? saved : assignment)));
      setEditingAssignment(null);
      setAssignOpen(false);
    } catch (cause) {
      throw new Error(academicErrorMessage(cause, "Unable to update subject"));
    } finally {
      setAssignPending(false);
    }
  };

  const handleSupervisorChange = async (teacherId?: string) => {
    if (!schoolClass || supervisorPending) return;
    setSupervisorPending(true);
    setActionError("");
    try {
      const saved = await updateClass(schoolClass.id, { classTeacherId: teacherId ?? null });
      setSupervisorId(saved.classTeacherId ?? "");
    } catch (cause) {
      setActionError(academicErrorMessage(cause, "Unable to update supervisor"));
    } finally {
      setSupervisorPending(false);
    }
  };

  const handleUnassignSubject = async () => {
    if (!deleteAssignmentId || deletePending) return;
    setDeletePending(true);
    setActionError("");
    try {
      await removeClassSubject(deleteAssignmentId);
      setAssignments((current) => current.filter((assignment) => assignment.id !== deleteAssignmentId));
      setDeleteAssignmentId(null);
    } catch (cause) {
      setActionError(academicErrorMessage(cause, "Unable to remove subject"));
    } finally {
      setDeletePending(false);
    }
  };

  if (!schoolClass) {
    if (notFound) {
      return <EmptyState title="Class not found" description="The class you are looking for does not exist." action={{ label: "Back to Grades", onClick: () => router.push("/academics/grades") }} />;
    }
    return (
      <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 p-6">
        <p className="font-medium text-destructive">Unable to load class</p>
        <p className="mt-1 text-sm text-muted-foreground">{initialError || "The class could not be loaded."}</p>
        <Button type="button" className="mt-4" onClick={() => router.refresh()}>Retry</Button>
      </div>
    );
  }

  const datedClass = schoolClass as ApiClassWithDates;
  const className = schoolClass.className;
  const gradeHref = gradeDetailHref(schoolClass.educationLevel, schoolClass.grade);
  const detailGradeLabel =
    GRADES.find(
      (row) =>
        row.level.toLowerCase() === schoolClass.educationLevel.toLowerCase() &&
        row.grade.toLowerCase() === schoolClass.grade.toLowerCase(),
    )?.label ?? schoolClass.grade;
  // Assignments arrive class-scoped: one row per subject by construction.
  const classAssignments = assignments.filter((assignment) => assignment.classId === schoolClass.id);
  const distinctSubjectIds = new Set(classAssignments.map((assignment) => assignment.subjectId));
  const distinctTeacherIds = new Set<string>();
  if (supervisorId) distinctTeacherIds.add(supervisorId);
  classAssignments.forEach((assignment) => { if (assignment.teacherId) distinctTeacherIds.add(assignment.teacherId); });
  const timetableSlots = timetable.filter((entry) => entry.classId === schoolClass.id);
  const scopedTimetableSlots = timetableSlots.filter(
    (entry) =>
      (entry.timetableType ?? "REGULAR") === timetableScope.timetableType &&
      (timetableScope.timetableType !== "EXAMINATION" || (entry.examName ?? "") === timetableScope.examName.trim()),
  );

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.replace(`${gradeHref}/${schoolClass.id}?tab=${value}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/academics" className="hover:text-foreground">Academic</Link>
        <ChevronRight size={14} aria-hidden />
        <Link href="/academics/grades" className="hover:text-foreground">Grades</Link>
        <ChevronRight size={14} aria-hidden />
        <Link href={gradeHref} className="hover:text-foreground">{detailGradeLabel}</Link>
        <ChevronRight size={14} aria-hidden />
        <span className="text-foreground font-medium">{className}</span>
      </nav>

      <div className="flex flex-wrap gap-3 justify-between items-start">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex flex-wrap gap-2 items-center">
            {className}
            <Badge variant="secondary">{schoolClass.educationLevel}</Badge>
            <Badge variant="outline">{gradeLabel(schoolClass.grade, schoolClass.track)}</Badge>
            {schoolClass.track ? <Badge variant="info">{schoolClass.track}</Badge> : null}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Created {formatDate(datedClass.createdAt)} Â· Updated {formatDate(datedClass.updatedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.push(gradeHref)}>Back</Button>
          <Button type="button" onClick={() => router.push(`${gradeHref}?edit=${schoolClass.id}`)}><Pencil size={14} /> Edit</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="subjects">Subjects ({distinctSubjectIds.size})</TabsTrigger>
          <TabsTrigger value="timetable">Timetable ({timetableSlots.length})</TabsTrigger>
          <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
          <TabsTrigger value="teachers">Teachers ({distinctTeacherIds.size})</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Class Profile</CardTitle>
                <CardDescription>Read-only summary</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Education Level:</span> {schoolClass.educationLevel}</p>
                <p><span className="text-muted-foreground">Grade:</span> {gradeLabel(schoolClass.grade, schoolClass.track)}</p>
                <p><span className="text-muted-foreground">Class Name:</span> {className}</p>
                <p><span className="text-muted-foreground">Capacity:</span> {schoolClass.capacity ?? "â€”"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Stats</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3 text-center">
                  <Users size={20} className="mx-auto text-muted-foreground" aria-hidden />
                  <p className="text-2xl font-semibold mt-1">{students.length}</p>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <GraduationCap size={20} className="mx-auto text-muted-foreground" aria-hidden />
                  <p className="text-2xl font-semibold mt-1">{distinctTeacherIds.size}</p>
                  <p className="text-xs text-muted-foreground">Teachers</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subjects">
          {errors.subjects ? <ResourceError message={errors.subjects} onRetry={() => router.refresh()} /> : null}
          {errors.subjectAssignments ? <ResourceError message={errors.subjectAssignments} onRetry={() => router.refresh()} /> : null}
          {actionError ? (
            <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <span>{actionError}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setActionError("")}>Dismiss</Button>
            </div>
          ) : null}
          {!errors.subjects && !errors.subjectAssignments && classAssignments.length === 0 ? <EmptyState title="No subjects" description="No subjects assigned to this class." /> : null}
          {classAssignments.length > 0 ? (
            <SubjectsTable
              assignments={classAssignments}
              subjects={subjects}
              teachers={teachers}
              onEdit={(assignment) => {
                if (assignPending) return;
                setEditingAssignment({ id: assignment.id, subjectId: assignment.subjectId, teacherId: assignment.teacherId });
                setAssignOpen(true);
              }}
              onUnassign={(id) => { if (!deletePending) setDeleteAssignmentId(id); }}
            />
          ) : null}

          <SubjectAssignDialog
            key={`${assignOpen ? "open" : "closed"}-${editingAssignment?.id ?? "new"}`}
            open={assignOpen}
            onOpenChange={(open) => {
              setAssignOpen(open);
              if (!open) setEditingAssignment(null);
            }}
            subjects={subjects}
            assignedSubjectIds={new Set(classAssignments.map((assignment) => assignment.subjectId))}
            teachers={teachers}
            editing={editingAssignment}
            track={schoolClass?.track ?? null}
            onSubmit={(values) => handleUpdateSubject(values)}
            pending={assignPending}
            error=""
          />

          <AlertDialog open={Boolean(deleteAssignmentId)} onOpenChange={(open) => { if (!open && !deletePending) setDeleteAssignmentId(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove subject?</AlertDialogTitle>
                <AlertDialogDescription>This will unassign the subject from this class. Timetable cells using it may be affected.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteAssignmentId(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { if (!deletePending) void handleUnassignSubject(); }}>{deletePending ? "Removing…" : "Remove"}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="timetable">
          {errors.timetable ? <ResourceError message={errors.timetable} onRetry={() => router.refresh()} /> : null}
          {!errors.timetable ? (
            <div className="space-y-4">
              <div className="print:hidden">
                <TimetableScopeControls
                  classes={[]}
                  scope={{ ...timetableScope, classId: schoolClass.id }}
                  onChange={(next) => setTimetableScope({ timetableType: next.timetableType, examName: next.examName, periodsPerDay: next.periodsPerDay })}
                  hideClass
                />
              </div>
              <ClassWeekEditor
                key={`${schoolClass.id}:${timetableScope.timetableType}:${timetableScope.examName.trim()}`}
                schoolClass={schoolClass}
                classSubjects={classAssignments}
                subjects={subjects}
                teachers={teachers}
                initialEntries={scopedTimetableSlots}
                timetableType={timetableScope.timetableType}
                examName={timetableScope.examName.trim()}
                periodsPerDay={timetableScope.periodsPerDay}
              />
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="students">
          {errors.students ? <ResourceError message={errors.students} onRetry={() => router.refresh()} /> : null}
          {!errors.students && students.length === 0 ? <EmptyState title="No students" description="No students are enrolled in this class." /> : null}
          {students.length > 0 ? <StudentsTable students={students} /> : null}
        </TabsContent>

        <TabsContent value="teachers">
          {errors.teachers ? <ResourceError message={errors.teachers} onRetry={() => router.refresh()} /> : null}
          <div className="mb-3 flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end print:hidden">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="class-supervisor">Supervisor</Label>
              <Select
                id="class-supervisor"
                value={supervisorId}
                onChange={(event) => void handleSupervisorChange(event.target.value || undefined)}
                disabled={supervisorPending || teachers.length === 0}
              >
                <option value="">No supervisor</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>{teacherName(teacher)}</option>
                ))}
              </Select>
            </div>
            {supervisorPending ? <p role="status" className="text-xs text-muted-foreground sm:pb-2">Saving…</p> : null}
          </div>
          {actionError ? (
            <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <span>{actionError}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setActionError("")}>Dismiss</Button>
            </div>
          ) : null}
          {!errors.teachers && distinctTeacherIds.size === 0 ? <EmptyState title="No teachers assigned" description="Assign subject teachers to this class on the Subjects tab." /> : null}
          {distinctTeacherIds.size > 0 ? <TeachersTable teachers={teachers} teacherIds={Array.from(distinctTeacherIds)} assignments={classAssignments} subjects={subjects} supervisorId={supervisorId} /> : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResourceError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
      <span>{message}</span>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>Retry</Button>
    </div>
  );
}

function StudentsTable({ students }: { students: ApiStudent[] }) {
  const router = useRouter();
  const columns: Column<ApiStudent>[] = [
    { id: "name", header: "Name", accessor: (student) => <span className="font-medium">{studentFullName(student)}</span>, sortable: true },
    { id: "roleNumber", header: "Roll No", accessor: (student) => <span className="font-mono text-xs">{student.roleNumber}</span> },
    { id: "gender", header: "Gender", accessor: (student) => student.gender ?? "â€”" },
    { id: "status", header: "Status", accessor: (student) => <Badge variant={student.status === "ACTIVE" ? "success" : "muted"}>{student.status}</Badge> },
  ];
  return <DataTable data={students} columns={columns} getRowId={(student) => student.id} onRowClick={(student) => router.push(`/students/all/${student.id}`)} />;
}

function SubjectsTable({ assignments, subjects, teachers, onEdit, onUnassign }: { assignments: ApiClassSubject[]; subjects: ApiSubject[]; teachers: ApiTeacher[]; onEdit: (assignment: ApiClassSubject) => void; onUnassign: (id: string) => void }) {
  const rows: SubjectRow[] = assignments.map((assignment) => {
    const subject = assignment.subject ?? subjects.find((candidate) => candidate.id === assignment.subjectId);
    const teacher = assignment.teacher ? teachers.find((candidate) => candidate.id === assignment.teacherId) ?? nestedTeacher(assignment.teacher) : teachers.find((candidate) => candidate.id === assignment.teacherId);
    return {
      id: assignment.id,
      subject: subject?.name ?? "—",
      teacher: teacher ? teacherName(teacher) : "—",
    };
  });
  const columns: Column<SubjectRow>[] = [
    { id: "subject", header: "Subject", accessor: (row) => row.subject },
    { id: "teacher", header: "Teacher", accessor: (row) => row.teacher },
    {
      id: "actions",
      header: "",
      accessor: (row) => (
        <span className="flex items-center justify-end gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(assignments.find((assignment) => assignment.id === row.id) ?? assignments[0])} aria-label={`Edit ${row.subject}`}>
            <Pencil size={14} aria-hidden />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onUnassign(row.id)} aria-label={`Unassign ${row.subject}`}>
            <Trash2 size={14} aria-hidden />
          </Button>
        </span>
      ),
    },
  ];
  return <DataTable data={rows} columns={columns} getRowId={(row) => row.id} emptyTitle="No subjects found" emptyDescription="No subject assignments are available for this class." />;
}

function nestedTeacher(teacher: NonNullable<ApiClassSubject["teacher"]>): ApiTeacher {
  return {
    id: teacher.id,
    status: teacher.user?.status ?? "ACTIVE",
    user: teacher.user,
  };
}

type TeacherRow = {
  id: string;
  name: string;
  employeeNumber: string;
  status: string;
  subjects: string;
  supervisor: boolean;
};

function TeachersTable({ teachers, teacherIds, assignments, subjects, supervisorId }: { teachers: ApiTeacher[]; teacherIds: string[]; assignments: ApiClassSubject[]; subjects: ApiSubject[]; supervisorId: string }) {
  const router = useRouter();
  const rows: TeacherRow[] = teacherIds
    .map((id) => teachers.find((teacher) => teacher.id === id))
    .filter((teacher): teacher is ApiTeacher => Boolean(teacher))
    .map((teacher) => ({
      id: teacher.id,
      name: teacherName(teacher),
      employeeNumber: teacher.employeeNumber ?? "—",
      status: teacher.status,
      subjects:
        assignments
          .filter((assignment) => assignment.teacherId === teacher.id)
          .map((assignment) => assignment.subject?.name ?? subjects.find((subject) => subject.id === assignment.subjectId)?.name)
          .filter(Boolean)
          .join(", ") || "—",
      supervisor: supervisorId === teacher.id,
    }));
  const columns: Column<TeacherRow>[] = [
    { id: "name", header: "Name", accessor: (row) => <span className="font-medium">{row.name}</span>, sortable: true },
    { id: "employeeNumber", header: "Employee No.", accessor: (row) => <span className="font-mono text-xs">{row.employeeNumber}</span> },
    { id: "status", header: "Status", accessor: (row) => <Badge variant={row.status === "ACTIVE" ? "success" : "muted"}>{row.status}</Badge> },
    { id: "subjects", header: "Subjects", accessor: (row) => row.subjects },
    {
      id: "role",
      header: "Role",
      accessor: (row) => (row.supervisor ? <Badge variant="success">Supervisor</Badge> : <span className="text-muted-foreground">—</span>),
    },
  ];
  return <DataTable data={rows} columns={columns} getRowId={(row) => row.id} onRowClick={(row) => router.push(`/teachers/${row.id}`)} emptyTitle="No teachers found" emptyDescription="No teachers are assigned to this class." />;
}

