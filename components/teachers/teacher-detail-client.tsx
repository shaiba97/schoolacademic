"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Phone, Pencil, Power, PowerOff, BookOpen } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { TeacherFormDialog } from "@/components/teachers/teacher-form-dialog";
import { TeacherAvatar } from "@/components/teachers/teacher-avatar";
import type { ApiDepartment, ApiTeacher } from "@/lib/api/types";
import { updateTeacher, updateTeacherStatus, fullName, profileImageDocument, deptName } from "@/lib/api/teachers";
import { uploadTeacherFile, deleteStagedFile } from "@/lib/api/storage";
import { TeacherCredentials } from "@/components/teachers/teacher-credentials";
import { academicErrorMessage, formatAcademicDate } from "@/components/academics/academic-utils";

function statusBadge(teacher: ApiTeacher) {
  return <Badge variant={teacher.status === "ACTIVE" ? "success" : "muted"}>{teacher.status}</Badge>;
}

export function TeacherDetailClient({
  teacher,
  departments = [],
  departmentsError = "",
}: {
  teacher: ApiTeacher;
  departments?: ApiDepartment[];
  departmentsError?: string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");

  const profileImage = profileImageDocument(teacher);

  async function handleEdit(values: Parameters<React.ComponentProps<typeof TeacherFormDialog>["onSubmit"]>[0], files: Parameters<React.ComponentProps<typeof TeacherFormDialog>["onSubmit"]>[1]) {
    const stagedKeys: string[] = [];
    const documents: Array<{ documentType: "PROFILE_IMAGE"; objectKey: string; originalName: string; contentType: string; size: number }> = [];
    try {
      const replaceProfile = files.some((f) => f.documentType === "PROFILE_IMAGE");
      for (const doc of teacher.documents ?? []) {
        // Only the avatar still lives in the fixed-slot table; every other
        // document is a named credential managed by TeacherCredentials.
        if (doc.documentType !== "PROFILE_IMAGE") continue;
        if (replaceProfile) continue;
        documents.push({ documentType: "PROFILE_IMAGE", objectKey: doc.objectKey, originalName: doc.originalName, contentType: doc.contentType, size: doc.size });
      }
      for (const file of files) {
        if (file.documentType !== "PROFILE_IMAGE") continue;
        const stored = await uploadTeacherFile({ file: file.file, draftId: teacher.id, documentType: "PROFILE_IMAGE" });
        stagedKeys.push(stored.objectKey);
        documents.push({ documentType: "PROFILE_IMAGE", objectKey: stored.objectKey, originalName: stored.originalName, contentType: stored.contentType, size: stored.size });
      }

      setPending(true);
      setError("");
      // Build the update payload explicitly (same shape as the teachers list
      // client): split names, file-picker File objects never leave the client —
      // only staged-upload StoredObjects travel in `documents`.
      const parts = values.fullname.trim().split(/\s+/);
      await updateTeacher(teacher.id, {
        firstName: parts[0] ?? values.fullname.trim(),
        ...(parts.length > 1 ? { lastName: parts.slice(1).join(" ") } : {}),
        phone: values.phone,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth,
        ...(values.departmentId ? { departmentId: values.departmentId } : {}),
        ...(values.password ? { password: values.password } : {}),
        documents,
        status: teacher.status,
      });
      router.refresh();
      setEditOpen(false);
    } catch (cause) {
      await Promise.all(stagedKeys.map((key) => deleteStagedFile(key).catch(() => undefined)));
      setError(academicErrorMessage(cause, "Unable to update teacher"));
    } finally {
      setPending(false);
    }
  }

  async function handleStatusChange() {
    const nextStatus = teacher.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setPending(true);
    setError("");
    try {
      await updateTeacherStatus(teacher.id, nextStatus);
      router.refresh();
      setStatusOpen(false);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to update teacher status"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      {departmentsError ? <p role="note" className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">Departments could not be loaded — department names may show as Unassigned. {departmentsError}</p> : null}

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <nav className="flex items-center gap-1.5 mb-5 text-sm text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/teachers" className="hover:text-foreground">Teachers</Link>
            <ChevronRight size={14} aria-hidden />
            <span className="text-foreground font-medium truncate">{fullName(teacher)}</span>
          </nav>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <TeacherAvatar teacher={teacher} photoObjectKey={profileImage?.objectKey} size="lg" />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold tracking-tight truncate">{fullName(teacher)}</h1>
              <p className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-2 items-center">
                <Badge variant="outline">{deptName(teacher, departments)}</Badge>
                {teacher.user?.phone ? <span className="inline-flex items-center gap-1"><Phone size={12} aria-hidden />{teacher.user.phone}</span> : null}
                {statusBadge(teacher)}
                <Badge variant="secondary">{teacher.gender}</Badge>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Employee {teacher.employeeNumber || "—"} · {teacher.status}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil size={14} /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setStatusOpen(true)}>
                {teacher.status === "ACTIVE" ? <><Power size={14} /> Deactivate</> : <><PowerOff size={14} /> Reactivate</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info sections */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Full Name:</span> {fullName(teacher)}</p>
            <p><span className="text-muted-foreground">Gender:</span> {teacher.gender}</p>
            <p><span className="text-muted-foreground">Date of Birth:</span> {formatAcademicDate(teacher.dateOfBirth)}</p>
            <p><span className="text-muted-foreground">Phone:</span> <span className="font-mono text-xs">{teacher.user?.phone || "—"}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Academic Information</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Department:</span> {deptName(teacher, departments)}</p>
            <p><span className="text-muted-foreground">Employee No:</span> <span className="font-mono text-xs">{teacher.employeeNumber || "—"}</span></p>
            <p><span className="text-muted-foreground">Status:</span> {statusBadge(teacher)}</p>
          </CardContent>
        </Card>
        <TeacherCredentials teacherId={teacher.id} initialCredentials={teacher.credentials ?? []} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Teaching Assignments</CardTitle></CardHeader>
        <CardContent>
          {(teacher.classSubjects ?? []).length === 0 && (teacher.classTeacherFor ?? []).length === 0 ? (
            <EmptyState
              title="No teaching assignments"
              description="No subjects or class-teacher roles assigned yet."
              action={{ label: "Manage subjects", onClick: () => router.push("/academics/subjects") }}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">{(teacher.classSubjects ?? []).length} subject{(teacher.classSubjects ?? []).length === 1 ? "" : "s"}</Badge>
                <Badge variant="outline">{(teacher.classTeacherFor ?? []).length} class-teacher role{(teacher.classTeacherFor ?? []).length === 1 ? "" : "s"}</Badge>
              </div>
              {(teacher.classSubjects ?? []).length > 0 ? (
                <div className="space-y-2">
                  {(teacher.classSubjects ?? []).map((assignment) => (
                    <div key={assignment.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-lg border bg-muted shrink-0">
                        <BookOpen size={16} aria-hidden className="text-muted-foreground" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{assignment.subject?.name ?? "Subject"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {assignment.schoolClass?.className ?? "Class"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {(teacher.classTeacherFor ?? []).length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {(teacher.classTeacherFor ?? []).map((schoolClass) => (
                    <Badge key={schoolClass.id} variant="secondary">Class teacher · {schoolClass.className}</Badge>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <TeacherFormDialog
        open={editOpen}
        onOpenChange={(open) => { if (!pending) setEditOpen(open); }}
        defaultValues={{
          fullname: fullName(teacher),
          phone: teacher.user?.phone ?? "",
          gender: teacher.gender as never,
          dateOfBirth: teacher.dateOfBirth?.slice(0, 10) ?? "",
          departmentId: teacher.departmentId ?? "",
          password: "",
          profileImage: null,
        }}
        departments={departments}
        isEdit
        pending={pending}
        error={error ? { form: error } : undefined}
        onSubmit={handleEdit}
      />

      {/* Status AlertDialog */}
      <AlertDialog open={statusOpen} onOpenChange={setStatusOpen}>
        <AlertDialogContent open={statusOpen} onOpenChange={setStatusOpen}>
          <AlertDialogHeader>
            <AlertDialogTitle>{teacher.status === "ACTIVE" ? "Deactivate Teacher?" : "Reactivate Teacher?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {teacher.status === "ACTIVE"
                ? `${fullName(teacher)} will be marked as inactive but their profile is kept and the account can be reactivated later.`
                : `${fullName(teacher)} will be marked as active again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStatusOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (!pending) void handleStatusChange(); }}>
              {teacher.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}