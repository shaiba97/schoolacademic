"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/native-select";
import { createDepartment, listDepartments } from "@/lib/api/departments";
import type { ApiDepartment, BatchSubjectItem } from "@/lib/api/types";

export type SubjectRow = {
  key: string;
  name: string;
  departmentId: string;
};

export type SubjectWizardValues = {
  rows: SubjectRow[];
};

export function SubjectDialog({
  open,
  onOpenChange,
  defaultRows,
  isEdit = false,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRows: SubjectRow[];
  isEdit?: boolean;
  pending: boolean;
  error: string;
  onSubmit: (values: SubjectWizardValues) => Promise<void>;
}) {
  const [rows, setRows] = React.useState<SubjectRow[]>(defaultRows);
  const [departments, setDepartments] = React.useState<ApiDepartment[]>([]);
  const [validationError, setValidationError] = React.useState("");
  const [loadingOptions, setLoadingOptions] = React.useState(true);

  // Create-on-the-fly: which row (if any) swapped its select for a text input.
  const [newDeptForRow, setNewDeptForRow] = React.useState<string | null>(null);
  const [newDeptName, setNewDeptName] = React.useState("");
  const [deptPending, setDeptPending] = React.useState(false);
  const [deptError, setDeptError] = React.useState("");
  const keyCounter = React.useRef(defaultRows.length + 1);

  React.useEffect(() => {
    let cancelled = false;
    listDepartments()
      .then((deptList) => {
        if (cancelled) return;
        setDepartments(deptList);
        // Convenience: with exactly one department there is no real choice to make.
        if (deptList.length === 1) {
          setRows((current) => current.map((row) => (row.departmentId ? row : { ...row, departmentId: deptList[0].id })));
        }
      })
      .catch(() => {
        if (!cancelled) setDepartments([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRow = (key: string, patch: Partial<SubjectRow>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const addRow = () => {
    setRows((current) => [
      ...current,
      { key: `row-${keyCounter.current++}`, name: "", departmentId: departments[0]?.id ?? "" },
    ]);
  };

  const removeRow = (key: string) =>
    setRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : current));

  const saveDepartment = async () => {
    const name = newDeptName.trim();
    if (!name || !newDeptForRow) return;
    setDeptPending(true);
    setDeptError("");
    try {
      const created = await createDepartment({ name });
      setDepartments((current) => [...current, created]);
      updateRow(newDeptForRow, { departmentId: created.id });
      setNewDeptForRow(null);
      setNewDeptName("");
    } catch (cause) {
      setDeptError(cause instanceof Error ? cause.message : "Unable to create department");
    } finally {
      setDeptPending(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    const cleaned = rows.map((row) => ({ ...row, name: row.name.trim() }));
    const blank = cleaned.findIndex((row) => !row.name);
    if (blank !== -1) {
      setValidationError(`Row ${blank + 1} needs a subject name`);
      return;
    }
    const missingDept = cleaned.findIndex((row) => !row.departmentId);
    if (missingDept !== -1) {
      setValidationError(`Row ${missingDept + 1} needs a department`);
      return;
    }
    const names = cleaned.map((row) => row.name.toLowerCase());
    if (new Set(names).size !== names.length) {
      setValidationError("Duplicate subject names in this list");
      return;
    }
    if (departments.length === 0) {
      setValidationError("Create a department first — subjects belong to one");
      return;
    }

    setValidationError("");
    await onSubmit({ rows: cleaned });
  };

  const departmentOptions = (row: SubjectRow) =>
    newDeptForRow === row.key ? (
      <div className="flex gap-1.5">
        <Input
          autoFocus
          value={newDeptName}
          onChange={(event) => setNewDeptName(event.target.value)}
          placeholder="Department name"
          maxLength={100}
          aria-label="New department name"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void saveDepartment();
            }
            if (event.key === "Escape") {
              setNewDeptForRow(null);
              setDeptError("");
            }
          }}
          disabled={deptPending}
        />
        <Button type="button" size="sm" onClick={() => void saveDepartment()} disabled={deptPending || !newDeptName.trim()}>
          {deptPending ? "…" : "Add"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => { setNewDeptForRow(null); setDeptError(""); }} disabled={deptPending} aria-label="Cancel new department">
          <X size={14} />
        </Button>
      </div>
    ) : (
      <Select
        value={row.departmentId}
        onChange={(event) => {
          if (event.target.value === "__new__") {
            setNewDeptForRow(row.key);
            setDeptError("");
            return;
          }
          updateRow(row.key, { departmentId: event.target.value });
        }}
        disabled={pending || loadingOptions}
        aria-label="Department"
      >
        <option value="">{loadingOptions ? "Loading departments…" : "Select department"}</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>{department.name}</option>
        ))}
        <option value="__new__">＋ New department…</option>
      </Select>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit subject" : "Add subjects"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Rename the subject or move it to another department." : "Add one or more subjects to the catalog. Assign them to classes later."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 p-6 pt-0">
          <div className="space-y-3">
            {!isEdit && rows.length > 1 ? (
              <div className="grid grid-cols-[1fr_1fr_32px] gap-1.5 px-0.5 text-xs font-medium text-muted-foreground">
                <span>Subject name</span>
                <span>Department</span>
                <span className="sr-only">Remove</span>
              </div>
            ) : null}

            {rows.map((row, index) => (
              <div key={row.key} className="rounded-lg border p-2.5 space-y-2">
                {!isEdit && rows.length > 1 ? <p className="text-xs text-muted-foreground">Subject {index + 1}</p> : null}
                <div className={isEdit ? "space-y-2" : "grid gap-2 sm:grid-cols-[1fr_1fr_32px]"}>
                  <Input
                    value={row.name}
                    onChange={(event) => updateRow(row.key, { name: event.target.value })}
                    placeholder="Subject name"
                    maxLength={150}
                    aria-label="Subject name"
                    disabled={pending}
                    autoFocus={isEdit}
                  />
                  <div className="space-y-1.5">{departmentOptions(row)}</div>
                  {!isEdit && rows.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(row.key)}
                      disabled={pending || rows.length === 1}
                      aria-label={`Remove subject ${index + 1}`}
                    >
                      <X size={14} />
                    </Button>
                  ) : null}
                </div>

                {deptError && newDeptForRow === row.key ? (
                  <p role="alert" className="text-xs text-destructive">{deptError}</p>
                ) : null}
              </div>
            ))}

            {!isEdit ? (
              <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={pending}>
                <Plus size={14} /> Add another subject
              </Button>
            ) : null}
          </div>

          {validationError || error ? (
            <p role="alert" className="text-sm text-destructive">{validationError || error}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending || loadingOptions}>
              {pending ? "Saving…" : isEdit ? "Save subject" : `Add ${rows.length} subject${rows.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function toSubjectItems(rows: SubjectRow[]): BatchSubjectItem[] {
  return rows.map((row) => ({
    name: row.name,
    departmentId: row.departmentId,
  }));
}

export function emptySubjectRow(key = "row-0"): SubjectRow {
  return { key, name: "", departmentId: "" };
}
