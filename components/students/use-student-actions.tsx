"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { AdmissionRecordDialog } from "@/components/students/admission-record-dialog";
import { archiveStudent, deleteStudent, updateStudentStatus } from "@/lib/api/students";
import type { ApiStudent } from "@/lib/api/types";
import { studentFullName } from "@/lib/api/mappers";
import { academicErrorMessage } from "@/components/academics/academic-utils";

export function studentStatusBadgeVariant(
  status: string,
): "success" | "info" | "purple" | "warning" | "destructive" | "muted" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "TRANSFERRED":
      return "info";
    case "GRADUATED":
      return "purple";
    case "POSTPONED":
      return "warning";
    case "FIRED":
      return "destructive";
    default:
      return "muted";
  }
}

export type StatusMode = "FIRE" | "POSTPONE";

/**
 * Shared student action flows (status changes with required reasons,
 * guarded delete, admission record dialog, transfer/archive navigation).
 * Used by both the students table and the student details page so the two
 * surfaces behave identically. Mutations report back through `onChanged`
 * (refresh with the updated record) and `onError` (banner message).
 */
export function useStudentActions({
  onChanged,
  onError,
  onDeleted,
}: {
  onChanged: (updated: ApiStudent) => void;
  onError: (message: string) => void;
  onDeleted?: (deletedId: string) => void;
}) {
  const router = useRouter();
  const [statusTarget, setStatusTarget] = React.useState<{ student: ApiStudent; mode: StatusMode } | null>(null);
  const [statusReason, setStatusReason] = React.useState("");
  const [statusPending, setStatusPending] = React.useState(false);
  const [statusError, setStatusError] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<ApiStudent | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);
  const [archiveTarget, setArchiveTarget] = React.useState<ApiStudent | null>(null);
  const [archivePending, setArchivePending] = React.useState(false);
  const [admissionTarget, setAdmissionTarget] = React.useState<ApiStudent | null>(null);
  const [actionPending, setActionPending] = React.useState(false);

  async function handleStatusConfirm() {
    if (!statusTarget || statusPending) return;
    if (!statusReason.trim()) {
      setStatusError("A reason is required.");
      return;
    }
    setStatusPending(true);
    setStatusError("");
    try {
      const updated = await updateStudentStatus(statusTarget.student.id, {
        status: statusTarget.mode === "FIRE" ? "FIRED" : "POSTPONED",
        reason: statusReason.trim(),
      });
      onChanged(updated);
      setStatusTarget(null);
      setStatusReason("");
    } catch (cause) {
      setStatusError(academicErrorMessage(cause, "Unable to update status"));
    } finally {
      setStatusPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deletePending) return;
    setDeletePending(true);
    try {
      await deleteStudent(deleteTarget.id);
      const id = deleteTarget.id;
      setDeleteTarget(null);
      if (onDeleted) onDeleted(id);
      else onChanged({ ...deleteTarget });
    } catch (cause) {
      onError(academicErrorMessage(cause, "Unable to delete student"));
      setDeleteTarget(null);
    } finally {
      setDeletePending(false);
    }
  }

  async function handleArchiveConfirm() {
    if (!archiveTarget || archivePending) return;
    setArchivePending(true);
    try {
      const updated = await archiveStudent(archiveTarget.id);
      onChanged(updated);
      setArchiveTarget(null);
    } catch (cause) {
      onError(academicErrorMessage(cause, "Unable to archive student"));
      setArchiveTarget(null);
    } finally {
      setArchivePending(false);
    }
  }

  function openArchive(student: ApiStudent) {
    setArchiveTarget(student);
  }

  function openStatus(student: ApiStudent, mode: StatusMode) {
    setStatusTarget({ student, mode });
    setStatusReason("");
    setStatusError("");
  }

  function openDelete(student: ApiStudent) {
    setDeleteTarget(student);
  }

  function openAdmission(student: ApiStudent) {
    setAdmissionTarget(student);
  }

  function transferTo(student: ApiStudent) {
    router.push(`/students/transfers?studentId=${student.id}`);
  }

  const dialogs = (
    <>
      <AlertDialog
        open={!!archiveTarget}
        onOpenChange={(open) => {
          if (!open && !archivePending) setArchiveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive student?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget
                ? `${studentFullName(archiveTarget)} will be marked WITHDRAWN. Records are kept and the student can be reactivated later.`
                : "Archive this student."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setArchiveTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleArchiveConfirm()}>
              {archivePending ? "Archiving…" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!statusTarget}
        onOpenChange={(open) => {
          if (!open && !statusPending) {
            setStatusTarget(null);
            setStatusReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusTarget?.mode === "FIRE" ? "Fire student?" : "Postpone student?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget
                ? `${studentFullName(statusTarget.student)} will be marked ${statusTarget.mode === "FIRE" ? "FIRED" : "POSTPONED"}. A reason is required and is recorded on the student file.`
                : "Update student status."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label htmlFor="student-status-reason" className="text-sm font-medium">Reason *</label>
            <Input
              id="student-status-reason"
              value={statusReason}
              onChange={(event) => setStatusReason(event.target.value)}
              placeholder="e.g. Repeated misconduct after warnings"
              autoFocus
            />
            {statusError ? (
              <p role="alert" className="text-sm text-destructive">{statusError}</p>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStatusTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleStatusConfirm()}>
              {statusPending ? "Saving…" : statusTarget?.mode === "FIRE" ? "Fire" : "Postpone"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deletePending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${studentFullName(deleteTarget)} and ALL linked records (enrollments, results, attendance, guardian links) will be permanently deleted. This cannot be undone — consider Archive instead.`
                : "Delete this student."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              {deletePending ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdmissionRecordDialog
        student={admissionTarget}
        open={!!admissionTarget}
        onOpenChange={(open) => {
          if (!open) setAdmissionTarget(null);
        }}
      />
    </>
  );

  return {
    dialogs,
    actionPending,
    openStatus,
    openDelete,
    openAdmission,
    openArchive,
    transferTo,
    archive: handleArchiveConfirm,
  };
}
