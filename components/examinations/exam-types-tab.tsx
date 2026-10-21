"use client";

import * as React from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createExamType, deleteExamType, listExamTypes, updateExamType } from "@/lib/api/exam-types";
import type { ApiExamType, CreateExamTypePayload } from "@/lib/api/types";
import { academicErrorMessage } from "@/components/academics/academic-utils";

export function ExamTypesTab({ initialData }: { initialData: ApiExamType[] }) {
  const [data, setData] = React.useState(initialData);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ApiExamType | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ApiExamType | null>(null);
  const [pending, setPending] = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [name, setName] = React.useState("");
  const [weight, setWeight] = React.useState("");

  function openCreate() {
    setEditing(null);
    setName("");
    setWeight("");
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(type: ApiExamType) {
    if (pending) return;
    setEditing(type);
    setName(type.name);
    setWeight(type.defaultWeight != null ? String(type.defaultWeight) : "");
    setFormError("");
    setFormOpen(true);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const payload: CreateExamTypePayload = {
      name: name.trim(),
      ...(weight.trim() && !Number.isNaN(Number(weight)) ? { defaultWeight: Number(weight) } : {}),
    };
    setPending(true);
    setFormError("");
    try {
      const saved = editing ? await updateExamType(editing.id, payload) : await createExamType(payload);
      setData((current) =>
        editing ? current.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...current],
      );
      setFormOpen(false);
      setEditing(null);
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to save exam type"));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeletePending(true);
    setError("");
    try {
      await deleteExamType(deleteTarget.id);
      setData((current) => current.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to delete exam type"));
      setDeleteTarget(null);
    } finally {
      setDeletePending(false);
    }
  }

  async function retry() {
    setLoading(true);
    setError("");
    try {
      setData(await listExamTypes());
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to load exam types"));
    } finally {
      setLoading(false);
    }
  }

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((t) => t.name.toLowerCase().includes(q));
  }, [data, search]);

  const columns: Column<ApiExamType>[] = [
    {
      id: "name",
      header: "Name",
      accessor: (t) => <span className="font-medium">{t.name}</span>,
      sortable: true,
    },
    {
      id: "weight",
      header: "Default Weight",
      accessor: (t) => <span className="font-mono text-xs">{t.defaultWeight ?? "—"}</span>,
      sortable: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-start">
        <p className="text-sm text-muted-foreground">Reusable templates — Midterm, Final, Quiz, Practical.</p>
        <Button type="button" onClick={openCreate} disabled={pending}>
          <Plus size={16} /> Add Exam Type
        </Button>
      </div>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void retry()} disabled={loading}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-2.5 top-2.5 text-muted-foreground" aria-hidden />
        <Input
          placeholder="Search exam types…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-8"
          aria-label="Search exam types"
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
          title="No exam types yet"
          description="Create Midterm, Final, Quiz or Practical templates to start setting up exams."
          action={{ label: "Add Exam Type", onClick: openCreate }}
        />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(t) => t.id}
          rowActions={[
            { label: "Edit", icon: <Pencil size={14} />, onClick: openEdit },
            {
              label: "Delete",
              icon: <Trash2 size={14} />,
              variant: "destructive",
              onClick: (t) => {
                if (!pending) setDeleteTarget(t);
              },
            },
          ]}
          emptyTitle="No exam types found"
          emptyDescription="No exam types match the current search."
        />
      )}

      <Dialog open={formOpen} onOpenChange={(open) => { if (!pending) { setFormOpen(open); if (!open) setEditing(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit exam type" : "Add exam type"}</DialogTitle>
            <DialogDescription>
              {editing ? "Rename this type or change its default weight." : "Create a reusable exam template."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => void handleSave(event)}>
            <div className="space-y-2">
              <label htmlFor="exam-type-name" className="text-sm font-medium">Name</label>
              <Input
                id="exam-type-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Midterm"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="exam-type-weight" className="text-sm font-medium">Default weight (optional)</label>
              <Input
                id="exam-type-weight"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                placeholder="e.g. 1"
                inputMode="decimal"
              />
            </div>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">{formError}</p>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending ? "Saving…" : editing ? "Save changes" : "Create exam type"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deletePending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete exam type?</AlertDialogTitle>
            <AlertDialogDescription>
              {`"${deleteTarget?.name}" will be permanently deleted. Types used by exams cannot be deleted — remove or reassign those exams first.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              {deletePending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
