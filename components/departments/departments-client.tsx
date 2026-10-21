"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { DepartmentFormDialog, type DepartmentFormValues } from "@/components/departments/department-form-dialog";
import { createDepartment, deleteDepartment, listDepartments, updateDepartment } from "@/lib/api/departments";
import type { ApiDepartment, CreateDepartmentPayload } from "@/lib/api/types";
import { academicErrorMessage } from "@/components/academics/academic-utils";

export function DepartmentsClient({
  initialData,
  initialError = "",
}: {
  initialData: ApiDepartment[];
  initialError?: string;
}) {
  const router = useRouter();
  const [data, setData] = React.useState(initialData);
  const [error, setError] = React.useState(initialError);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingDepartment, setEditingDepartment] = React.useState<ApiDepartment | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ApiDepartment | null>(null);
  const [pending, setPending] = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  function openCreate() {
    setEditingDepartment(null);
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(department: ApiDepartment) {
    if (pending) return;
    setEditingDepartment(department);
    setFormError("");
    setFormOpen(true);
  }

  function closeForm(open: boolean) {
    if (pending) return;
    setFormOpen(open);
    if (!open) setEditingDepartment(null);
  }

  async function handleSave(values: DepartmentFormValues) {
    const payload: CreateDepartmentPayload = {
      name: values.name.trim(),
    };

    setPending(true);
    setFormError("");
    try {
      const saved = editingDepartment
        ? await updateDepartment(editingDepartment.id, payload)
        : await createDepartment(payload);

      setData((current) =>
        editingDepartment
          ? current.map((department) => (department.id === saved.id ? saved : department))
          : [saved, ...current],
      );
      setFormOpen(false);
      setEditingDepartment(null);
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to save department"));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeletePending(true);
    setError("");
    try {
      await deleteDepartment(deleteTarget.id);
      setData((current) => current.filter((department) => department.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to delete department"));
      setDeleteTarget(null);
    } finally {
      setDeletePending(false);
    }
  }

  async function retry() {
    setLoading(true);
    setError("");
    try {
      const refreshed = await listDepartments();
      setData(refreshed);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to load departments"));
    } finally {
      setLoading(false);
    }
  }

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((department) =>
      department.name.toLowerCase().includes(q),
    );
  }, [data, search]);

  const columns: Column<ApiDepartment>[] = [
    {
      id: "name",
      header: "Name",
      accessor: (department) => <span className="font-medium">{department.name}</span>,
      sortable: true,
    },
    {
      id: "teachers",
      header: "Teachers",
      accessor: (department) => <Badge variant="outline">{department._count?.teachers ?? 0}</Badge>,
      sortable: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-start">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Departments</h1>
          <p className="text-sm text-muted-foreground mt-1">Academic departments — live from the Academic API.</p>
        </div>
        <Button type="button" onClick={openCreate} disabled={pending}>
          <Plus size={16} /> Add Department
        </Button>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void retry()} disabled={loading}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-2.5 top-2.5 text-muted-foreground" aria-hidden />
        <Input
          placeholder="Search departments…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-8"
          aria-label="Search departments"
        />
      </div>

      {loading && data.length === 0 ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 && data.length === 0 ? (
        <EmptyState
          title="No departments yet"
          description="Add your first department to start organizing teachers and subjects."
          action={{ label: "Add Department", onClick: openCreate }}
        />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(department) => department.id}
          onRowClick={(department) => router.push(`/departments/${department.id}`)}
          rowActions={[
            { label: "View", icon: <Eye size={14} />, onClick: (department) => router.push(`/departments/${department.id}`) },
            { label: "Edit", icon: <Pencil size={14} />, onClick: openEdit },
            {
              label: "Delete",
              icon: <Trash2 size={14} />,
              variant: "destructive",
              onClick: (department) => {
                if (!pending) setDeleteTarget(department);
              },
            },
          ]}
          emptyTitle="No departments found"
          emptyDescription="No department records match the current filters."
        />
      )}
      {loading && data.length > 0 ? (
        <p role="status" className="text-xs text-muted-foreground">
          Refreshing departments…
        </p>
      ) : null}

      <DepartmentFormDialog
        key={`${editingDepartment?.id ?? "new"}-${formOpen ? "open" : "closed"}`}
        open={formOpen}
        onOpenChange={closeForm}
        defaultValues={
          editingDepartment
            ? {
                name: editingDepartment.name,
              }
            : undefined
        }
        isEdit={!!editingDepartment}
        pending={pending}
        error={formError ? { form: formError } : undefined}
        onSubmit={handleSave}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deletePending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete department?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?._count?.teachers
                ? `"${deleteTarget.name}" has ${deleteTarget._count.teachers} teacher(s) assigned. Move those teachers to another department first before deleting.`
                : `"${deleteTarget?.name}" will be permanently deleted. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            {deleteTarget?._count?.teachers ? null : (
              <AlertDialogAction onClick={() => void handleDelete()}>
                {deletePending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
