"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Plus, Search, Power, PowerOff, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TeacherFormDialog } from "@/components/teachers/teacher-form-dialog";
import { TeacherFormValues, type GenderValue } from "@/components/teachers/teacher-form";
import { createTeacher, deleteTeacher, listTeachers, updateTeacher, updateTeacherStatus, deptName, fullName, profileImageDocument } from "@/lib/api/teachers";
import { uploadTeacherFile, deleteStagedFile } from "@/lib/api/storage";
import { TeacherAvatar } from "@/components/teachers/teacher-avatar";
import type { ApiDepartment, ApiPaginated, ApiTeacher, CreateTeacherPayload, TeacherDocumentPayload } from "@/lib/api/types";
import { academicErrorMessage } from "@/components/academics/academic-utils";

function formatDOB(dob?: string | null) {
  if (!dob) return "—";
  try {
    return new Date(dob).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dob;
  }
}

export function TeachersClient({ initialData, departments = [], initialError = "" }: { initialData: ApiPaginated<ApiTeacher>; departments?: ApiDepartment[]; initialError?: string }) {
  const router = useRouter();
  const [data, setData] = React.useState(initialData);
  const [error, setError] = React.useState(initialError);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState("ALL");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingTeacher, setEditingTeacher] = React.useState<ApiTeacher | null>(null);
  const [statusTarget, setStatusTarget] = React.useState<ApiTeacher | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ApiTeacher | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [statusPending, setStatusPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  function openCreate() {
    setEditingTeacher(null);
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(teacher: ApiTeacher) {
    if (pending) return;
    setEditingTeacher(teacher);
    setFormError("");
    setFormOpen(true);
  }

  function closeForm(open: boolean) {
    if (pending) return;
    setFormOpen(open);
    if (!open) setEditingTeacher(null);
  }

  async function handleSave(values: TeacherFormValues, files: Array<{ documentType: "PROFILE_IMAGE" | "ID_PROOF"; file: File }>) {
    const draftId = crypto.randomUUID();
    const stagedKeys: string[] = [];
    const documents: TeacherDocumentPayload[] = [];

    try {
      const replaceProfile = files.some((file) => file.documentType === "PROFILE_IMAGE");
      const replaceIdProof = files.some((file) => file.documentType === "ID_PROOF");
      for (const document of editingTeacher?.documents ?? []) {
        if (document.documentType === "PROFILE_IMAGE" && replaceProfile) continue;
        if (document.documentType === "ID_PROOF" && replaceIdProof) continue;
        documents.push({
          documentType: document.documentType as "PROFILE_IMAGE" | "ID_PROOF",
          objectKey: document.objectKey,
          originalName: document.originalName,
          contentType: document.contentType,
          size: document.size,
        });
      }
      for (const file of files) {
        const stored = await uploadTeacherFile({ file: file.file, draftId, documentType: file.documentType });
        stagedKeys.push(stored.objectKey);
        documents.push({ documentType: file.documentType, ...stored });
      }

      const parts = values.fullname.trim().split(/\s+/);
      const base: Omit<CreateTeacherPayload, "password"> = {
        firstName: parts[0] ?? values.fullname.trim(),
        ...(parts.length > 1 ? { lastName: parts.slice(1).join(" ") } : {}),
        phone: values.phone,
        gender: values.gender as GenderValue,
        dateOfBirth: values.dateOfBirth,
        ...(values.departmentId ? { departmentId: values.departmentId } : {}),
        documents,
      };

      setPending(true);
      setFormError("");
      const saved = editingTeacher
        ? await updateTeacher(editingTeacher.id, {
            ...base,
            ...(values.password ? { password: values.password } : {}),
            status: editingTeacher.status,
          })
        : await createTeacher({ ...base, password: values.password });

      setData((current) => ({
        ...current,
        total: editingTeacher ? current.total : current.total + 1,
        data: editingTeacher ? current.data.map((teacher) => (teacher.id === saved.id ? saved : teacher)) : [saved, ...current.data],
      }));
      setFormOpen(false);
      setEditingTeacher(null);
    } catch (cause) {
      await Promise.all(stagedKeys.map((objectKey) => deleteStagedFile(objectKey).catch(() => undefined)));
      setFormError(academicErrorMessage(cause, "Unable to save teacher"));
    } finally {
      setPending(false);
    }
  }

  async function handleStatusChange() {
    if (!statusTarget) return;
    const nextStatus = statusTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setStatusPending(true);
    setError("");
    try {
      await updateTeacherStatus(statusTarget.id, nextStatus);
      setData((current) => ({
        ...current,
        data: current.data.map((teacher) => (teacher.id === statusTarget.id ? { ...teacher, status: nextStatus } : teacher)),
      }));
      setStatusTarget(null);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to update teacher status"));
    } finally {
      setStatusPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeletePending(true);
    setError("");
    const snapshot = data;
    // Optimistic: the row disappears immediately, and comes straight back with
    // the server's reason if the delete is refused.
    setData((current) => ({
      ...current,
      total: Math.max(0, current.total - 1),
      data: current.data.filter((teacher) => teacher.id !== deleteTarget.id),
    }));
    try {
      await deleteTeacher(deleteTarget.id);
      setDeleteTarget(null);
    } catch (cause) {
      setData(snapshot);
      setError(academicErrorMessage(cause, "Unable to delete teacher"));
    } finally {
      setDeletePending(false);
    }
  }

  async function retry() {
    setLoading(true);
    setError("");
    try {
      const refreshed = await listTeachers({ page: 1, limit: 100 });
      setData(refreshed);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to load teachers"));
    } finally {
      setLoading(false);
    }
  }

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.data.filter((teacher) => {
      if (deptFilter !== "ALL" && teacher.departmentId !== deptFilter) return false;
      if (!q) return true;
      const haystack = [fullName(teacher), teacher.user?.phone ?? "", teacher.employeeNumber ?? "", deptName(teacher, departments)].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [data.data, deptFilter, search]);

  const columns: Column<ApiTeacher>[] = [
    {
      id: "teacher",
      header: "Teacher",
      accessor: (teacher) => {
        const photo = profileImageDocument(teacher);
        return (
          <span className="flex items-center gap-3">
            <TeacherAvatar teacher={teacher} photoObjectKey={photo?.objectKey} size="sm" />
            <span className="font-medium truncate min-w-0">{fullName(teacher)}</span>
          </span>
        );
      },
      sortable: true,
    },
    {
      id: "employeeNumber",
      header: "Employee No",
      accessor: (teacher) => <span className="font-mono text-xs">{teacher.employeeNumber || "—"}</span>,
      sortable: true,
    },
    {
      id: "department",
      header: "Department",
      accessor: (teacher) => <Badge variant="outline">{deptName(teacher, departments)}</Badge>,
      sortable: true,
    },
    {
      id: "phone",
      header: "Phone",
      accessor: (teacher) => <span className="font-mono text-xs">{teacher.user?.phone || "—"}</span>,
      sortable: true,
    },
    {
      id: "dateOfBirth",
      header: "Date of Birth",
      accessor: (teacher) => <span className="text-sm">{formatDOB(teacher.dateOfBirth)}</span>,
      sortable: true,
    },
    {
      id: "status",
      header: "Status",
      accessor: (teacher) => <Badge variant={teacher.status === "ACTIVE" ? "success" : "muted"}>{teacher.status}</Badge>,
      sortable: true,
    },
  ];

  const defaults: Partial<TeacherFormValues> | undefined = editingTeacher
    ? {
        fullname: fullName(editingTeacher),
        phone: editingTeacher.user?.phone ?? "",
        gender: (editingTeacher.gender as GenderValue) ?? "MALE",
        dateOfBirth: editingTeacher.dateOfBirth?.slice(0, 10) ?? "",
        departmentId: editingTeacher.departmentId ?? "",
      }
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-start">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Teachers</h1>
          <p className="text-sm text-muted-foreground mt-1">Teacher profiles, files and account status — live from the Academic API.</p>
        </div>
        <Button type="button" onClick={openCreate} disabled={pending}><Plus size={16} /> Add Teacher</Button>
      </div>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void retry()} disabled={loading}>Retry</Button>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-2.5 top-2.5 text-muted-foreground" aria-hidden />
          <Input placeholder="Search loaded teachers…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-8" aria-label="Search teachers" />
        </div>
        <select
          value={deptFilter}
          onChange={(event) => setDeptFilter(event.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          aria-label="Filter by department"
        >
          <option value="ALL">All Departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>{department.name}</option>
          ))}
        </select>
      </div>

      {loading && data.data.length === 0 ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((item) => <Skeleton key={item} className="h-12 w-full" />)}
        </div>
      ) : filtered.length === 0 && data.data.length === 0 ? (
        <EmptyState title="No teachers yet" description="Add your first teacher to start managing your academic staff." action={{ label: "Add Teacher", onClick: openCreate }} />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(teacher) => teacher.id}
          onRowClick={(teacher) => router.push(`/teachers/${teacher.id}`)}
          rowActions={[
            { label: "View", icon: <Eye size={14} />, onClick: (teacher) => router.push(`/teachers/${teacher.id}`) },
            { label: "Edit", icon: <Pencil size={14} />, onClick: openEdit },
            {
              label: teacher => teacher.status === "ACTIVE" ? "Deactivate" : "Reactivate",
              icon: (teacher) => teacher.status === "ACTIVE" ? <PowerOff size={14} /> : <Power size={14} />,
              variant: "destructive",
              onClick: (teacher) => { if (!pending) setStatusTarget(teacher); },
            },
            {
              label: "Delete",
              icon: <Trash2 size={14} />,
              variant: "destructive",
              onClick: (teacher) => { if (!pending && !deletePending) setDeleteTarget(teacher); },
            },
          ]}
          emptyTitle="No teachers found"
          emptyDescription="No teacher records match the current filters."
        />
      )}
      {loading && data.data.length > 0 ? <p role="status" className="text-xs text-muted-foreground">Refreshing teachers…</p> : null}

      <TeacherFormDialog
        key={`${editingTeacher?.id ?? "new"}-${formOpen ? "open" : "closed"}`}
        open={formOpen}
        onOpenChange={closeForm}
        defaultValues={defaults}
        departments={departments}
        isEdit={!!editingTeacher}
        pending={pending}
        error={formError ? { form: formError } : undefined}
        onSubmit={handleSave}
      />

      <AlertDialog open={!!statusTarget} onOpenChange={(open) => { if (!open && !statusPending) setStatusTarget(null); }}>
        <AlertDialogContent open={!!statusTarget} onOpenChange={(open) => { if (!open && !statusPending) setStatusTarget(null); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>{statusTarget?.status === "ACTIVE" ? "Deactivate teacher?" : "Reactivate teacher?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget ? `${fullName(statusTarget)} will be ${statusTarget.status === "ACTIVE" ? "deactivated (INACTIVE)" : "reactivated (ACTIVE)"}. Their assignments are kept, and the account can be reactivated later.` : "Update teacher status."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStatusTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (!statusPending) void handleStatusChange(); }}>
              {statusPending ? "Updating…" : statusTarget?.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deletePending) setDeleteTarget(null); }}>
        <AlertDialogContent open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deletePending) setDeleteTarget(null); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget ? fullName(deleteTarget) : "teacher"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the teacher and their documents. Their login is disabled but kept for
              audit history. Teachers who still head a section, teach subjects, or have attendance or
              invigilation records cannot be deleted — deactivate them instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (!deletePending) void handleDelete(); }}>
              {deletePending ? "Deleting…" : "Delete teacher"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

