"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Users, Pencil, Trash2, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { DepartmentFormDialog, type DepartmentFormValues } from "@/components/departments/department-form-dialog";
import { updateDepartment, deleteDepartment } from "@/lib/api/departments";
import type { ApiDepartment, ApiTeacher, CreateDepartmentPayload } from "@/lib/api/types";
import { fullName } from "@/lib/api/teachers";
import { academicErrorMessage } from "@/components/academics/academic-utils";

export function DepartmentDetailClient({
  department,
  teachers = [],
  teachersError = "",
}: {
  department: ApiDepartment;
  teachers?: ApiTeacher[];
  teachersError?: string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleEdit(values: DepartmentFormValues) {
    const payload: CreateDepartmentPayload = {
      name: values.name.trim(),
    };
    setPending(true);
    setError("");
    try {
      await updateDepartment(department.id, payload);
      router.refresh();
      setEditOpen(false);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to update department"));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    setPending(true);
    setError("");
    try {
      await deleteDepartment(department.id);
      router.push("/departments");
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to delete department"));
      setDeleteOpen(false);
    } finally {
      setPending(false);
    }
  }

  const teacherCount = department._count?.teachers ?? teachers.length;

  return (
    <div className="space-y-4">
      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardContent className="p-6">
          <nav className="flex items-center gap-1.5 mb-5 text-sm text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/departments" className="hover:text-foreground">Departments</Link>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium truncate">{department.name}</span>
          </nav>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <span className="inline-flex size-20 rounded-lg bg-muted border items-center justify-center shrink-0">
              <Building2 size={28} className="text-muted-foreground" />
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold tracking-tight">{department.name}</h1>
              <p className="text-sm text-muted-foreground mt-2 flex flex-wrap gap-2 items-center">
                <Badge variant="secondary">{teacherCount} teacher{teacherCount === 1 ? "" : "s"}</Badge>
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil size={14} /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users size={14} /> Teachers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teachersError ? (
            <p className="text-sm text-destructive">{teachersError}</p>
          ) : teachers.length === 0 ? (
            <EmptyState title="No teachers in this department" description="Assign teachers to this department from the Teachers page." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {teachers.map((teacher) => (
                <Link
                  key={teacher.id}
                  href={`/teachers/${teacher.id}`}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-muted border shrink-0">
                    <Users size={16} className="text-muted-foreground" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fullName(teacher)}</p>
                    <p className="text-xs text-muted-foreground truncate">{teacher.employeeNumber || "—"}</p>
                  </div>
                  <Badge variant={teacher.status === "ACTIVE" ? "success" : "muted"}>{teacher.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DepartmentFormDialog
        key={`${department.id}-${editOpen ? "open" : "closed"}`}
        open={editOpen}
        onOpenChange={(open) => { if (!pending) setEditOpen(open); }}
        defaultValues={{
          name: department.name,
        }}
        isEdit
        pending={pending}
        error={error ? { form: error } : undefined}
        onSubmit={handleEdit}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete department?</AlertDialogTitle>
            <AlertDialogDescription>
              {teacherCount
                ? `"${department.name}" has ${teacherCount} teacher(s) assigned. Move those teachers to another department first before deleting.`
                : `"${department.name}" will be permanently deleted. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>Cancel</AlertDialogCancel>
            {teacherCount ? null : (
              <AlertDialogAction onClick={() => void handleDelete()}>
                {pending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
