"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClass, deleteClass, listClasses, updateClass } from "@/lib/api/classes";
import { listClassSubjects } from "@/lib/api/subjects";
import type { ApiClassSubject, ApiPaginated, ApiSchoolClass, ApiSubject, ApiTeacher, CreateClassPayload } from "@/lib/api/types";
import { ClassForm, type ClassFormValues } from "./class-form";
import { GradeSubjectsTab } from "./grade-subjects-tab";
import { GradeTeachersTab } from "./grade-teachers-tab";
import { academicErrorMessage } from "./academic-utils";
import { gradeDetailHref, type GradeKey } from "./grade-keys";

const mobileMediaQuery = "(max-width: 639px)";

function subscribeToMobile(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(mobileMediaQuery);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getMobileSnapshot() {
  return window.matchMedia(mobileMediaQuery).matches;
}

function getServerMobileSnapshot() {
  return false;
}

async function loadGradeAssignments(
  classList: ApiSchoolClass[],
): Promise<Record<string, ApiClassSubject[]>> {
  const results = await Promise.allSettled(classList.map((schoolClass) => listClassSubjects(schoolClass.id)));
  const next: Record<string, ApiClassSubject[]> = {};
  results.forEach((result, index) => {
    if (result.status === "fulfilled") next[classList[index].id] = result.value;
  });
  return next;
}

function toClassPayload(values: ClassFormValues): CreateClassPayload {  const capacity = values.capacity?.trim() ? Number(values.capacity.trim()) : undefined;
  return {
    className: values.className.trim(),
    educationLevel: values.educationLevel,
    grade: values.grade,
    track: values.track ?? null,
    gender: values.gender,
    capacity: capacity ?? null,
  };
}

export function GradeDetailClient({
  grade,
  initialData,
  initialError = "",
  subjects,
  teachers,
  initialEditId,
}: {
  grade: GradeKey;
  initialData: ApiPaginated<ApiSchoolClass>;
  initialError?: string;
  subjects: ApiSubject[];
  teachers: ApiTeacher[];
  initialEditId?: string;
}) {
  const router = useRouter();
  const [data, setData] = React.useState(initialData);
  const [error, setError] = React.useState(initialError);
  const [loading, setLoading] = React.useState(false);
  const [tab, setTab] = React.useState("classes");
  const [assignmentsByClass, setAssignmentsByClass] = React.useState<Record<string, ApiClassSubject[]>>({});
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingClass, setEditingClass] = React.useState<ApiSchoolClass | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [dismissedEditId, setDismissedEditId] = React.useState<string | null>(null);

  // ?edit=<classId> deep-link (used by the class page Edit button): opens the
  // edit dialog for a class of this grade, mirroring the old classes page.
  const requestedClass = initialEditId
    ? data.data.find(
        (schoolClass) =>
          schoolClass.id === initialEditId &&
          schoolClass.educationLevel === grade.level &&
          schoolClass.grade === grade.grade,
      )
    : undefined;
  const queryEditClass = initialEditId && dismissedEditId !== initialEditId ? requestedClass : undefined;
  const activeEditingClass = editingClass ?? queryEditClass;
  const activeFormOpen = formOpen || Boolean(queryEditClass);

  const clearEditQuery = React.useCallback(() => {
    if (initialEditId) {
      void router.replace(`/academics/grades/${grade.level.toLowerCase()}/${grade.grade.toLowerCase()}`);
    }
  }, [initialEditId, router, grade.level, grade.grade]);

  const classes = React.useMemo(
    () =>
      data.data.filter(
        (schoolClass) =>
          schoolClass.educationLevel === grade.level && schoolClass.grade === grade.grade,
      ),
    [data.data, grade.level, grade.grade],
  );

  const students = classes.reduce((sum, schoolClass) => sum + (schoolClass.counts?.students ?? 0), 0);

  // Load assignments for the grade's classes; refreshes whenever the class
  // list itself changes (create/delete included). States live in promise
  // continuations only.
  React.useEffect(() => {
    let cancelled = false;
    const classList = data.data.filter(
      (schoolClass) =>
        schoolClass.educationLevel === grade.level && schoolClass.grade === grade.grade,
    );
    loadGradeAssignments(classList).then((next) => {
      if (!cancelled) setAssignmentsByClass(next);
    });
    return () => {
      cancelled = true;
    };
  }, [data.data, grade.level, grade.grade]);

  const retry = async () => {
    setLoading(true);
    setError("");
    try {
      const refreshed = await listClasses({ page: 1, limit: 100 });
      setData(refreshed);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to load classes"));
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    if (pending) return;
    setEditingClass(null);
    setDismissedEditId(initialEditId ?? null);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (schoolClass: ApiSchoolClass) => {
    if (pending) return;
    setEditingClass(schoolClass);
    setDismissedEditId(initialEditId ?? null);
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = (open: boolean) => {
    if (pending) return;
    setFormOpen(open);
    if (!open) {
      setEditingClass(null);
      setDismissedEditId(initialEditId ?? null);
      setFormError("");
      clearEditQuery();
    }
  };

  const handleSave = async (values: ClassFormValues) => {
    const classId = activeEditingClass?.id;
    const payload = toClassPayload(values);
    setPending(true);
    setFormError("");
    try {
      const saved = classId
        ? await updateClass(classId, payload as Partial<CreateClassPayload>)
        : await createClass(payload as CreateClassPayload);
      setData((current) => ({
        ...current,
        total: classId ? current.total : current.total + 1,
        data: classId ? current.data.map((schoolClass) => (schoolClass.id === saved.id ? saved : schoolClass)) : [saved, ...current.data],
      }));
      setFormOpen(false);
      setEditingClass(null);
      setDismissedEditId(initialEditId ?? null);
      clearEditQuery();
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to save class"));
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeletePending(true);
    setError("");
    try {
      await deleteClass(deleteId);
      setData((current) => ({ ...current, total: Math.max(0, current.total - 1), data: current.data.filter((schoolClass) => schoolClass.id !== deleteId) }));
      setDeleteId(null);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to delete class"));
    } finally {
      setDeletePending(false);
    }
  };

  // Create is pre-scoped to this grade; the form cascade still governs
  // gender/track, so only valid combinations can be submitted.
  const defaults: Partial<ClassFormValues> | undefined = activeEditingClass
    ? {
        educationLevel: activeEditingClass.educationLevel as ClassFormValues["educationLevel"],
        grade: activeEditingClass.grade as ClassFormValues["grade"],
        track: (activeEditingClass.track as ClassFormValues["track"]) ?? null,
        gender: (activeEditingClass.gender as ClassFormValues["gender"]) ?? "",
        className: activeEditingClass.className,
        capacity: activeEditingClass.capacity == null ? "" : String(activeEditingClass.capacity),
      }
    : {
        educationLevel: grade.level as ClassFormValues["educationLevel"],
        grade: grade.grade as ClassFormValues["grade"],
        track: null,
      };

  const columns: Column<ApiSchoolClass>[] = [
    {
      id: "className",
      header: "Class Name",
      accessor: (schoolClass) => {
        const gender = schoolClass.gender === "BOYS" ? "boys" : schoolClass.gender === "GIRLS" ? "girls" : schoolClass.gender === "MIXED" ? "mixed" : "";
        return <span className="font-medium">{gender ? `${schoolClass.className} (${gender})` : schoolClass.className}</span>;
      },
      sortable: true,
    },
    {
      id: "capacity",
      header: "Capacity",
      accessor: (schoolClass) => schoolClass.capacity ?? "—",
      sortable: true,
    },
    {
      id: "students",
      header: "Students",
      accessor: (schoolClass) => schoolClass.counts?.students ?? 0,
    },
    {
      id: "teachers",
      header: "Teachers",
      accessor: (schoolClass) => schoolClass.counts?.teachers ?? 0,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {grade.label} <Badge variant={grade.level === "SECONDARY" ? "secondary" : "info"}>{grade.level}</Badge>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {classes.length} class{classes.length === 1 ? "" : "es"} · {students} student{students === 1 ? "" : "s"}
        </p>
      </div>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void retry()} disabled={loading}>Retry</Button>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
        </TabsList>

        <TabsContent value="classes">
          <div className="mb-3 flex justify-end">
            <Button type="button" size="sm" onClick={openCreate} disabled={pending}><Plus size={14} /> Add Class</Button>
          </div>
      {loading && data.data.length === 0 ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((item) => <Skeleton key={item} className="h-12 w-full" />)}
        </div>
      ) : classes.length === 0 && !error ? (
        <EmptyState title={`No ${grade.label} classes yet`} description={`Create the first class in this grade — level and grade are pre-filled.`} action={{ label: "Add Class", onClick: openCreate }} />
      ) : (
        <DataTable
          data={classes}
          columns={columns}
          getRowId={(schoolClass) => schoolClass.id}
          onRowClick={(schoolClass) => router.push(`${gradeDetailHref(grade.level, grade.grade)}/${schoolClass.id}`)}
          rowActions={[
            { label: "View", icon: <GraduationCap size={14} />, onClick: (schoolClass) => router.push(`${gradeDetailHref(grade.level, grade.grade)}/${schoolClass.id}`) },
            { label: "Edit", icon: <Pencil size={14} />, onClick: openEdit },
            { label: "Delete", icon: <Trash2 size={14} />, variant: "destructive", onClick: (schoolClass) => { if (!pending) setDeleteId(schoolClass.id); } },
          ]}
          emptyTitle="No classes found"
          emptyDescription="Create the first class in this grade."
        />
      )}
        </TabsContent>

        <TabsContent value="subjects">
          <GradeSubjectsTab
            grade={grade}
            gradeClasses={classes}
            subjects={subjects}
            teachers={teachers}
            assignmentsByClass={assignmentsByClass}
            onChanged={() => {
              void loadGradeAssignments(classes).then(setAssignmentsByClass);
            }}
          />
        </TabsContent>

        <TabsContent value="teachers">
          <GradeTeachersTab
            gradeClasses={classes}
            subjects={subjects}
            teachers={teachers}
            assignmentsByClass={assignmentsByClass}
            onChanged={() => {
              void loadGradeAssignments(classes).then(setAssignmentsByClass);
            }}
          />
        </TabsContent>
      </Tabs>

      <GradeClassFormDialog
        key={`${activeEditingClass?.id ?? "new"}-${activeFormOpen ? "open" : "closed"}`}
        open={activeFormOpen}
        onOpenChange={closeForm}
        defaultValues={defaults}
        onSubmit={handleSave}
        onCancel={() => closeForm(false)}
        pending={pending}
        error={formError}
        isEdit={Boolean(activeEditingClass)}
      />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => { if (!open && !deletePending) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete class?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the class. Sections and enrollments linked to this class may be affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (!deletePending) void handleDelete(); }}>{deletePending ? "Deleting…" : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GradeClassFormDialog({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  onCancel,
  pending,
  error,
  isEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<ClassFormValues>;
  onSubmit: (values: ClassFormValues) => Promise<void>;
  onCancel: () => void;
  pending: boolean;
  error: string;
  isEdit: boolean;
}) {
  const isMobile = React.useSyncExternalStore(subscribeToMobile, getMobileSnapshot, getServerMobileSnapshot);
  const form = <ClassForm defaultValues={defaultValues} onSubmit={onSubmit} onCancel={onCancel} pending={pending} error={error} />;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent open={open} onOpenChange={onOpenChange} side="bottom">
          <SheetHeader>
            <SheetTitle>{isEdit ? "Edit Class" : "Add Class"}</SheetTitle>
            <SheetDescription>{isEdit ? "Update class details" : "Create a new class"}</SheetDescription>
          </SheetHeader>
          {form}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent open={open} onOpenChange={onOpenChange} className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Class" : "Add Class"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update class details" : "Create a new class"}</DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-0">{form}</div>
      </DialogContent>
    </Dialog>
  );
}
