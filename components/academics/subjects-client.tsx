"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SubjectDialog, emptySubjectRow, toSubjectItems, type SubjectRow, type SubjectWizardValues } from "./subject-form";
import { Skeleton } from "@/components/ui/skeleton";
import { batchCreateSubjects, deleteSubject, listSubjects, updateSubject } from "@/lib/api/subjects";
import type { ApiPaginated, ApiSubject, CreateSubjectPayload } from "@/lib/api/types";
import { academicErrorMessage } from "./academic-utils";

export function SubjectsClient({ initialData, initialError = "" }: { initialData: ApiPaginated<ApiSubject>; initialError?: string }) {
  const [data, setData] = React.useState(initialData);
  const [error, setError] = React.useState(initialError);
  const [loading, setLoading] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingSubject, setEditingSubject] = React.useState<ApiSubject | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  const openCreate = () => {
    setEditingSubject(null);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (subject: ApiSubject) => {
    if (pending) return;
    setEditingSubject(subject);
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = (open: boolean) => {
    if (pending) return;
    setFormOpen(open);
    if (!open) {
      setEditingSubject(null);
      setFormError("");
    }
  };

  const handleSave = async (values: SubjectWizardValues) => {
    setPending(true);
    setFormError("");
    try {
      if (editingSubject) {
        const row = values.rows[0];
        const payload: CreateSubjectPayload = {
          name: row.name,
          departmentId: row.departmentId,
        };
        const saved = await updateSubject(editingSubject.id, payload);
        setData((current) => ({
          ...current,
          data: current.data.map((subject) => (subject.id === saved.id ? saved : subject)),
        }));
      } else {
        const result = await batchCreateSubjects({ items: toSubjectItems(values.rows) });
        const created = result.created;
        setData((current) => ({
          ...current,
          total: current.total + created.length,
          data: [...created.map((subject) => ({ ...subject, counts: { classes: 0 } })), ...current.data],
        }));
      }
      setFormOpen(false);
      setEditingSubject(null);
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to save subject"));
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeletePending(true);
    setError("");
    try {
      await deleteSubject(deleteId);
      setData((current) => ({ ...current, total: Math.max(0, current.total - 1), data: current.data.filter((subject) => subject.id !== deleteId) }));
      setDeleteId(null);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to delete subject"));
    } finally {
      setDeletePending(false);
    }
  };

  const retry = async () => {
    setLoading(true);
    setError("");
    try {
      const refreshed = await listSubjects({ page: 1, limit: 100 });
      setData(refreshed);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to load subjects"));
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<ApiSubject>[] = [
    { id: "name", header: "Name", accessor: (subject) => <span className="font-medium">{subject.name}</span>, sortable: true },
    { id: "department", header: "Department", accessor: (subject) => subject.department?.name ?? <span className="text-muted-foreground">—</span>, sortable: true },
    { id: "classes", header: "Classes", accessor: (subject) => <span className="tabular-nums">{subject.counts?.classes ?? 0}</span> },
  ];

  const defaults: SubjectRow[] = editingSubject
    ? [{ key: "edit", name: editingSubject.name, departmentId: editingSubject.departmentId ?? "" }]
    : [emptySubjectRow()];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Subjects</h1>
          <p className="text-sm text-muted-foreground">Subject catalog — needed before class-subject-teacher assignment.</p>
        </div>
        <Button type="button" onClick={openCreate} disabled={pending}><Plus size={16} /> New subject</Button>
      </div>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void retry()} disabled={loading}>Retry</Button>
        </div>
      ) : null}

      {loading && data.data.length === 0 ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((item) => <Skeleton key={item} className="h-12 w-full" />)}
        </div>
      ) : data.data.length === 0 ? (
        <EmptyState title="No subjects yet" description="Create the first subject to start building the catalog." action={{ label: "New subject", onClick: openCreate }} />
      ) : (
        <DataTable
          data={data.data}
          columns={columns}
          getRowId={(subject) => subject.id}
          searchKeys={["name"]}
          rowActions={[
            { label: "Edit", icon: <Pencil size={14} />, onClick: openEdit },
            { label: "Delete", icon: <Trash2 size={14} />, variant: "destructive", onClick: (subject) => { if (!pending) setDeleteId(subject.id); } },
          ]}
          emptyTitle="No subjects found"
          emptyDescription="No subject records are available."
        />
      )}
      {loading && data.data.length > 0 ? <p role="status" className="text-xs text-muted-foreground">Refreshing subjects…</p> : null}

      <SubjectDialog
        key={`${editingSubject?.id ?? "new"}-${formOpen ? "open" : "closed"}`}
        open={formOpen}
        onOpenChange={closeForm}
        defaultRows={defaults}
        isEdit={Boolean(editingSubject)}
        pending={pending}
        error={formError}
        onSubmit={handleSave}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open && !deletePending) setDeleteId(null); }}>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subject?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the subject and may affect class assignments.</AlertDialogDescription>
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
